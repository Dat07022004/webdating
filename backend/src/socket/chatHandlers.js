import { addUser, getSocketId, getSocketIds } from './onlineUsers.js';
import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

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
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  // 3. Rời khỏi room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  // 4. Gửi tin nhắn
  socket.on('send_message', async (data, callback) => {
    try {
      const { conversationId, receiverId, content, type = 'text' } = data;

      // Lưu tin nhắn vào DB
      const message = await Message.create({
        conversationId,
        senderId: userId,
        receiverId,
        type,
        content
      });

      // Cập nhật lastMessage cho Conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id
      });

      // Gửi tới phòng (nếu cả sender và receiver đang mở đoạn chat đó thì sẽ nhận được)
      io.to(conversationId).emit('receive_message', message);

      // Nếu receiver không nằm trong phòng chat (hoặc ta muốn push notification)
      // ta có thể emit trực tiếp vào các socket của receiver đó.
      const receiverSockets = getSocketIds(receiverId);
      if (receiverSockets.length > 0) {
        // Lấy tên người gửi để hiện thông báo
        const sender = await User.findById(userId).select('profile.personalInfo.name username');
        const senderName = sender?.profile?.personalInfo?.name || sender?.username || 'Ai đó';

        // Gửi thông báo 'new_message_alert' tới máy người nhận
        receiverSockets.forEach(sockId => {
          io.to(sockId).emit('new_message_alert', {
            ...message.toObject(),
            senderName
          });
          io.to(sockId).emit('new_notification', { type: 'message' });
        });

        // Lưu thông báo vào DB để hiện ở trang Notifications
        try {
          await Notification.create({
            userId: receiverId,
            senderId: userId,
            type: 'message',
            title: 'New Message',
            message: `${senderName} đã gửi cho bạn một tin nhắn.`,
            image: sender?.profile?.avatarUrl,
            metadata: { conversationId, messageId: message._id }
          });
        } catch (notificationErr) {
          console.error('[Notification] Message notification failed:', notificationErr.message);
        }
      }

      // Trả lại message cho người gửi (để update UI)
      if (typeof callback === 'function') {
        callback({ status: 'success', message });
      }
    } catch (error) {
      console.error('[Socket] send_message error:', error);
      if (typeof callback === 'function') {
        callback({ status: 'error', error: error.message });
      }
    }
  });

  // 5. Đánh dấu đã đọc
  socket.on('mark_as_seen', async (data) => {
    try {
      const { messageIds, conversationId } = data; // messageIds là mảng id
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { seen: true, seenAt: new Date() }
      );
      
      // Thông báo cho mọi người trong room là các tin nhắn này đã update trạng thái seen
      io.to(conversationId).emit('messages_seen', { messageIds, conversationId });
    } catch (error) {
      console.error('[Socket] mark_as_seen error:', error);
    }
  });

  // === WEB RTC SIGNALING (Phase 4 placeholder) ===

  socket.on('call_user', (data) => {
    const { targetUserId, offer } = data;
    const targetSocketId = getSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming_call', {
        callerUserId: userId,
        offer
      });
    }
  });

  socket.on('answer_call', (data) => {
    const { callerUserId, answer } = data;
    const callerSocketId = getSocketId(callerUserId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_answered', {
        answer
      });
    }
  });

  socket.on('ice_candidate', (data) => {
    const { targetUserId, candidate } = data;
    const targetSocketId = getSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', {
        senderUserId: userId,
        candidate
      });
    }
  });

  socket.on('end_call', (data) => {
    const { targetUserId } = data;
    const targetSockets = getSocketIds(targetUserId);
    targetSockets.forEach(sockId => {
      io.to(sockId).emit('call_ended', { userId });
    });
  });

  socket.on('call_rejected', (data) => {
    const { callerUserId } = data;
    const callerSocketId = getSocketId(callerUserId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_rejected', { userId });
    }
  });
}
