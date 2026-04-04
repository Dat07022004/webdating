import { randomUUID } from "node:crypto";
import { addUser, getSocketIds } from "./onlineUsers.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";

/**
 * Call session state in-memory.
 * @type {Map<string, {
 *   callId: string,
 *   callerUserId: string,
 *   calleeUserId: string,
 *   callerSocketId: string,
 *   calleeSocketIds: Set<string>,
 *   acceptedSocketId: string | null,
 *   status: 'ringing' | 'accepted',
 *   createdAt: number
 * }>} */
const callSessions = new Map();

function emitToSocketIds(io, socketIds, eventName, payload) {
  socketIds.forEach((sockId) => {
    io.to(sockId).emit(eventName, payload);
  });
}

function emitCompat(
  io,
  socketIds,
  eventName,
  payload,
  legacyEventName,
  legacyPayload = payload,
) {
  emitToSocketIds(io, socketIds, eventName, payload);
  if (legacyEventName) {
    emitToSocketIds(io, socketIds, legacyEventName, legacyPayload);
  }
}

function getSessionByParticipants(callerUserId, calleeUserId) {
  for (const session of callSessions.values()) {
    if (
      session.callerUserId === callerUserId &&
      session.calleeUserId === calleeUserId &&
      (session.status === "ringing" || session.status === "accepted")
    ) {
      return session;
    }
  }
  return null;
}

function resolveSessionFromPayload(payload, currentUserId) {
  if (payload?.callId && callSessions.has(payload.callId)) {
    return callSessions.get(payload.callId);
  }

  if (payload?.callerUserId) {
    return getSessionByParticipants(payload.callerUserId, currentUserId);
  }

  if (payload?.targetUserId) {
    const asCaller = getSessionByParticipants(
      currentUserId,
      payload.targetUserId,
    );
    if (asCaller) return asCaller;
    return getSessionByParticipants(payload.targetUserId, currentUserId);
  }

  return null;
}

function closeSession(callId) {
  callSessions.delete(callId);
}

/**
 * Đăng ký các Socket.io events liên quan đến chat.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerChatHandlers(io, socket) {
  const userId = socket.data.userId;

  // 1. Thêm user vào store ngay khi connect (vì connection đã qua auth middleware)
  addUser(userId, socket.id);

  // 2. Tham gia room theo conversationId
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  // 3. Rời khỏi room
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
  });

  // 4. Gửi tin nhắn
  socket.on("send_message", async (data, callback) => {
    try {
      const { conversationId, receiverId, content, type = "text" } = data;

      // Lưu tin nhắn vào DB
      const message = await Message.create({
        conversationId,
        senderId: userId,
        receiverId,
        type,
        content,
      });

      // Cập nhật lastMessage cho Conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
      });

      // Gửi tới phòng (nếu cả sender và receiver đang mở đoạn chat đó thì sẽ nhận được)
      io.to(conversationId).emit("receive_message", message);

      // Nếu receiver không nằm trong phòng chat (hoặc ta muốn push notification)
      // ta có thể emit trực tiếp vào các socket của receiver đó.
      const receiverSockets = getSocketIds(receiverId);
      if (receiverSockets.length > 0) {
        // Gửi thông báo 'new_message_alert' tới máy người nhận để tăng unreadCount ở sidebar chẳng hạn
        receiverSockets.forEach((sockId) => {
          io.to(sockId).emit("new_message_alert", message);
        });
      }

      // Trả lại message cho người gửi (để update UI)
      if (typeof callback === "function") {
        callback({ status: "success", message });
      }
    } catch (error) {
      console.error("[Socket] send_message error:", error);
      if (typeof callback === "function") {
        callback({ status: "error", error: error.message });
      }
    }
  });

  // 5. Đánh dấu đã đọc
  socket.on("mark_as_seen", async (data) => {
    try {
      const { messageIds, conversationId } = data; // messageIds là mảng id
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { seen: true, seenAt: new Date() },
      );

      // Thông báo cho mọi người trong room là các tin nhắn này đã update trạng thái seen
      io.to(conversationId).emit("messages_seen", {
        messageIds,
        conversationId,
      });
    } catch (error) {
      console.error("[Socket] mark_as_seen error:", error);
    }
  });

  // === WEB RTC SIGNALING ===

  const handleCallUser = (data = {}) => {
    const { targetUserId } = data;

    if (!targetUserId) {
      io.to(socket.id).emit("call-failed", { reason: "invalid-target" });
      return;
    }

    if (targetUserId === userId) {
      io.to(socket.id).emit("call-failed", { reason: "cannot-call-self" });
      return;
    }

    const calleeSocketIds = getSocketIds(targetUserId);
    if (calleeSocketIds.length === 0) {
      emitCompat(
        io,
        [socket.id],
        "call-failed",
        { reason: "callee-offline", targetUserId },
        null,
      );
      return;
    }

    const existingSession = getSessionByParticipants(userId, targetUserId);
    if (existingSession && existingSession.status === "ringing") {
      return;
    }

    const callId = randomUUID();
    const session = {
      callId,
      callerUserId: userId,
      calleeUserId: targetUserId,
      callerSocketId: socket.id,
      calleeSocketIds: new Set(calleeSocketIds),
      acceptedSocketId: null,
      status: "ringing",
      createdAt: Date.now(),
    };
    callSessions.set(callId, session);

    const incomingPayload = { callId, callerUserId: userId };
    emitCompat(
      io,
      calleeSocketIds,
      "incoming-call",
      incomingPayload,
      "incoming_call",
      incomingPayload,
    );
  };

  const handleCallAccepted = (data = {}) => {
    const session = resolveSessionFromPayload(data, userId);
    if (!session) {
      io.to(socket.id).emit("call-failed", {
        reason: "session-not-found",
        callId: data?.callId,
      });
      return;
    }

    if (session.calleeUserId !== userId) {
      io.to(socket.id).emit("call-failed", {
        reason: "not-callee",
        callId: session.callId,
      });
      return;
    }

    if (
      session.status === "accepted" &&
      session.acceptedSocketId &&
      session.acceptedSocketId !== socket.id
    ) {
      io.to(socket.id).emit("call-failed", {
        reason: "already-accepted",
        callId: session.callId,
      });
      return;
    }

    session.status = "accepted";
    session.acceptedSocketId = socket.id;

    const acceptedPayload = {
      callId: session.callId,
      calleeUserId: userId,
    };

    io.to(session.callerSocketId).emit("call-accepted", acceptedPayload);

    // Close ringing modal on non-selected callee sockets.
    const otherCalleeSockets = Array.from(session.calleeSocketIds).filter(
      (sockId) => sockId !== socket.id,
    );
    if (otherCalleeSockets.length > 0) {
      emitCompat(
        io,
        otherCalleeSockets,
        "call-ended",
        { callId: session.callId, reason: "answered-elsewhere" },
        "call_ended",
        { userId },
      );
    }
  };

  const handleWebrtcOffer = (data = {}) => {
    const { callId, offer } = data;
    if (!callId || !offer || !callSessions.has(callId)) return;

    const session = callSessions.get(callId);
    if (socket.id !== session.callerSocketId || !session.acceptedSocketId) {
      io.to(socket.id).emit("call-failed", {
        reason: "invalid-offer-route",
        callId,
      });
      return;
    }

    io.to(session.acceptedSocketId).emit("webrtc-offer", {
      callId,
      offer,
      callerUserId: session.callerUserId,
    });
  };

  const handleWebrtcAnswer = (data = {}) => {
    const { callId, answer } = data;
    if (!callId || !answer || !callSessions.has(callId)) return;

    const session = callSessions.get(callId);
    if (socket.id !== session.acceptedSocketId) {
      io.to(socket.id).emit("call-failed", {
        reason: "invalid-answer-route",
        callId,
      });
      return;
    }

    io.to(session.callerSocketId).emit("webrtc-answer", { callId, answer });
    io.to(session.callerSocketId).emit("call_answered", { callId, answer });
  };

  const handleIceCandidate = (data = {}) => {
    const { callId, candidate, targetUserId } = data;
    if (!candidate) return;

    if (callId && callSessions.has(callId)) {
      const session = callSessions.get(callId);

      let targetSocketId = null;
      if (socket.id === session.callerSocketId) {
        targetSocketId = session.acceptedSocketId;
      } else if (socket.id === session.acceptedSocketId) {
        targetSocketId = session.callerSocketId;
      }

      if (!targetSocketId) return;

      io.to(targetSocketId).emit("webrtc-ice-candidate", { callId, candidate });
      io.to(targetSocketId).emit("ice_candidate", {
        callId,
        senderUserId: userId,
        candidate,
      });
      return;
    }

    // Legacy fallback
    if (targetUserId) {
      const targets = getSocketIds(targetUserId);
      emitToSocketIds(io, targets, "ice_candidate", {
        senderUserId: userId,
        candidate,
      });
    }
  };

  const handleCallRejected = (data = {}) => {
    const session = resolveSessionFromPayload(data, userId);
    if (!session) return;

    const callerSockets = [session.callerSocketId];
    emitCompat(
      io,
      callerSockets,
      "call-rejected",
      {
        callId: session.callId,
        userId,
        reason: data?.reason || "declined",
      },
      "call_rejected",
      { userId },
    );

    closeSession(session.callId);
  };

  const handleCallEnded = (data = {}) => {
    const session = resolveSessionFromPayload(data, userId);
    if (!session) return;

    const peerSocketIds = new Set([session.callerSocketId]);
    if (session.acceptedSocketId) {
      peerSocketIds.add(session.acceptedSocketId);
    }

    emitCompat(
      io,
      Array.from(peerSocketIds),
      "call-ended",
      { callId: session.callId, userId, reason: data?.reason || "ended" },
      "call_ended",
      { userId },
    );

    closeSession(session.callId);
  };

  const handleSocketDisconnect = () => {
    for (const [callId, session] of callSessions.entries()) {
      if (session.callerSocketId === socket.id) {
        const targets = Array.from(session.calleeSocketIds);
        emitCompat(
          io,
          targets,
          "call-ended",
          { callId, reason: "caller-disconnected" },
          "call_ended",
          { userId },
        );
        closeSession(callId);
        continue;
      }

      if (session.calleeSocketIds.has(socket.id)) {
        session.calleeSocketIds.delete(socket.id);

        if (session.acceptedSocketId === socket.id) {
          emitCompat(
            io,
            [session.callerSocketId],
            "call-ended",
            { callId, reason: "peer-disconnected" },
            "call_ended",
            { userId },
          );
          closeSession(callId);
          continue;
        }

        if (
          session.status === "ringing" &&
          session.calleeSocketIds.size === 0
        ) {
          io.to(session.callerSocketId).emit("call-failed", {
            callId,
            reason: "callee-unavailable",
          });
          closeSession(callId);
        }
      }
    }
  };

  socket.on("call-user", handleCallUser);
  socket.on("call_user", handleCallUser);

  socket.on("call-accepted", handleCallAccepted);
  socket.on("answer_call", handleCallAccepted);

  socket.on("webrtc-offer", handleWebrtcOffer);
  socket.on("webrtc-answer", handleWebrtcAnswer);

  socket.on("webrtc-ice-candidate", handleIceCandidate);
  socket.on("ice_candidate", handleIceCandidate);

  socket.on("call-ended", handleCallEnded);
  socket.on("end_call", handleCallEnded);

  socket.on("call-rejected", handleCallRejected);
  socket.on("call_rejected", handleCallRejected);

  socket.on("disconnect", handleSocketDisconnect);
}
