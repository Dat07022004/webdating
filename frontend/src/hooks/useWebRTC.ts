import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";

export type CallState =
  | "idle"
  | "calling"
  | "receiving"
  | "connecting"
  | "in_call"
  | "failed";

export type CallType = "audio" | "video";

type StartCallOptions = {
  conversationId?: string;
  peerName?: string;
  peerImage?: string;
};

type IncomingCallPayload = {
  callId: string;
  callerUserId: string;
  callerName?: string;
  callType?: CallType;
  conversationId?: string;
};

type CallAcceptedPayload = {
  callId: string;
  calleeUserId: string;
  callType?: CallType;
  conversationId?: string;
};

type CallTerminalPayload = {
  callId?: string;
  targetUserId?: string;
  callType?: CallType;
  reason?: string;
};

type OfferPayload = {
  callId: string;
  offer: RTCSessionDescriptionInit;
};

type AnswerPayload = {
  callId: string;
  answer: RTCSessionDescriptionInit;
};

type IcePayload = {
  callId: string;
  candidate: RTCIceCandidateInit;
};

const resolveCallType = (value?: string): CallType =>
  value === "audio" ? "audio" : "video";

const permissionErrorMessage = (callType: CallType) =>
  callType === "audio"
    ? "Microphone permission is required to join this call."
    : "Camera and microphone permissions are required to join this call.";

const reasonMessage = (reason?: string) => {
  switch (reason) {
    case "media-permission-denied":
      return "The other user has not granted microphone/camera permission.";
    case "callee-offline":
      return "The other user is offline.";
    case "no-answer":
      return "The call was not answered.";
    case "declined":
      return "The call was declined.";
    case "callee-unavailable":
      return "The other user is unavailable.";
    case "caller-disconnected":
    case "peer-disconnected":
      return "The call ended because the connection was interrupted.";
    default:
      return "The call ended.";
  }
};

export const useWebRTC = () => {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallTypeState] = useState<CallType>("video");
  const [callError, setCallError] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserIdState] = useState<string | null>(null);
  const [incomingCallerId, setIncomingCallerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("User");
  const [peerImage, setPeerImage] = useState<string | undefined>();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const pendingIncomingCall = useRef<IncomingCallPayload | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const callTypeRef = useRef<CallType>("video");
  const conversationIdRef = useRef<string | undefined>();

  const setCallStateSafe = (state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  };

  const setCallTypeSafe = (type: CallType) => {
    callTypeRef.current = type;
    setCallTypeState(type);
  };

  const setRemoteUserIdSafe = (id: string | null) => {
    remoteUserIdRef.current = id;
    setRemoteUserIdState(id);
  };

  const clearTimers = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    remoteStream.current = null;
    pendingIceCandidates.current = [];

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    stopMedia();
    pendingIncomingCall.current = null;
    activeCallIdRef.current = null;
    conversationIdRef.current = undefined;
    setCallError(null);
    setCallStateSafe("idle");
    setRemoteUserIdSafe(null);
    setIncomingCallerId(null);
    setPeerName("User");
    setPeerImage(undefined);
  }, [clearTimers, stopMedia]);

  const failCall = useCallback(
    (message: string) => {
      clearTimers();
      stopMedia();
      pendingIncomingCall.current = null;
      activeCallIdRef.current = null;
      conversationIdRef.current = undefined;
      setCallError(message);
      setCallStateSafe("failed");

      errorTimeoutRef.current = setTimeout(() => {
        cleanup();
      }, 3500);
    },
    [cleanup, clearTimers, stopMedia],
  );

  const syncVideoElements = useCallback(() => {
    if (localVideoRef.current && localStream.current) {
      if (localVideoRef.current.srcObject !== localStream.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    }

    if (remoteVideoRef.current && remoteStream.current) {
      if (remoteVideoRef.current.srcObject !== remoteStream.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
      void remoteVideoRef.current.play().catch((error) => {
        console.warn("[WebRTC] remote media play failed:", error);
      });
    }
  }, []);

  const attachRemoteStream = async (stream: MediaStream) => {
    remoteStream.current = stream;
    if (!remoteVideoRef.current) return;

    stream.getTracks().forEach((track) => {
      if (!track.enabled) track.enabled = true;
    });

    if (remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
    }

    try {
      await remoteVideoRef.current.play();
    } catch (error) {
      console.warn("[WebRTC] remote media play failed:", error);
    }
  };

  const flushPendingIceCandidates = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription)
      return;

    while (pendingIceCandidates.current.length > 0) {
      const candidate = pendingIceCandidates.current.shift();
      if (!candidate) continue;

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      } catch (error) {
        console.error("[WebRTC] Failed to add buffered ICE candidate:", error);
      }
    }
  }, []);

  const emitEvent = useCallback(
    (eventName: string, payload: Record<string, unknown>) => {
      if (!socket) return;
      socket.emit(eventName, payload);
    },
    [socket],
  );

  const createPeerConnection = useCallback(
    (callId: string) => {
      if (peerConnection.current) {
        return peerConnection.current;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      });

      pc.onicecandidate = (event) => {
        if (!event.candidate || !callId) return;

        emitEvent("webrtc-ice-candidate", {
          callId,
          candidate: event.candidate,
        });
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          void attachRemoteStream(stream);
        }
      };

      pc.onconnectionstatechange = () => {
        const connectionState = pc.connectionState;
        if (connectionState === "connected") {
          clearTimers();
          setCallStateSafe("in_call");
        }

        if (
          connectionState === "failed" &&
          (callStateRef.current === "connecting" ||
            callStateRef.current === "in_call")
        ) {
          emitEvent("call-ended", {
            callId: activeCallIdRef.current,
            targetUserId: remoteUserIdRef.current,
            reason: "peer-disconnected",
          });
          failCall("The call connection failed.");
        }

        if (
          connectionState === "closed" &&
          callStateRef.current !== "idle" &&
          callStateRef.current !== "failed"
        ) {
          cleanup();
        }
      };

      if (localStream.current) {
        const existingTrackIds = new Set(
          pc.getSenders().map((sender) => sender.track?.id),
        );
        localStream.current.getTracks().forEach((track) => {
          if (localStream.current && !existingTrackIds.has(track.id)) {
            pc.addTrack(track, localStream.current);
          }
        });
      }

      peerConnection.current = pc;
      return pc;
    },
    [cleanup, clearTimers, emitEvent, failCall],
  );

  const initLocalStream = async (type: CallType) => {
    if (localStream.current) {
      const hasLiveTrack = localStream.current
        .getTracks()
        .some((track) => track.readyState === "live");
      if (hasLiveTrack) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
        return true;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return true;
    } catch (error) {
      console.error("Failed to get media devices:", error);
      return false;
    }
  };

  const startCall = async (
    targetUserId: string,
    type: CallType = "video",
    options: StartCallOptions = {},
  ) => {
    if (!socket || callStateRef.current !== "idle") return;

    setCallError(null);
    setCallTypeSafe(type);
    setRemoteUserIdSafe(targetUserId);
    setPeerName(options.peerName || "User");
    setPeerImage(options.peerImage);
    conversationIdRef.current = options.conversationId;

    const success = await initLocalStream(type);
    if (!success) {
      failCall(permissionErrorMessage(type));
      return;
    }

    setCallStateSafe("calling");

    emitEvent("call-user", {
      targetUserId,
      callType: type,
      conversationId: options.conversationId,
    });

    clearTimers();
    ringTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "calling") {
        emitEvent("call-ended", {
          targetUserId,
          conversationId: options.conversationId,
          reason: "no-answer",
        });
        failCall("The call was not answered.");
      }
    }, 30_000);
  };

  const rejectCall = useCallback(
    (reason = "declined") => {
      if (!socket) {
        cleanup();
        return;
      }

      if (pendingIncomingCall.current) {
        emitEvent("call-rejected", {
          callId: pendingIncomingCall.current.callId,
          callerUserId: pendingIncomingCall.current.callerUserId,
          callType: callTypeRef.current,
          conversationId: conversationIdRef.current,
          reason,
        });
      } else if (activeCallIdRef.current) {
        emitEvent("call-rejected", {
          callId: activeCallIdRef.current,
          callerUserId: remoteUserIdRef.current,
          callType: callTypeRef.current,
          conversationId: conversationIdRef.current,
          reason,
        });
      }

      cleanup();
    },
    [cleanup, emitEvent, socket],
  );

  const answerCall = async () => {
    if (!socket || !pendingIncomingCall.current || !remoteUserIdRef.current)
      return;

    const currentCallType = callTypeRef.current;
    const success = await initLocalStream(currentCallType);
    if (!success) {
      emitEvent("call-rejected", {
        callId: pendingIncomingCall.current.callId,
        callerUserId: pendingIncomingCall.current.callerUserId,
        callType: currentCallType,
        conversationId: conversationIdRef.current,
        reason: "media-permission-denied",
      });
      failCall(permissionErrorMessage(currentCallType));
      return;
    }

    const { callId } = pendingIncomingCall.current;
    activeCallIdRef.current = callId;
    setCallStateSafe("connecting");
    createPeerConnection(callId);

    emitEvent("call-accepted", {
      callId,
      callerUserId: remoteUserIdRef.current,
      callType: currentCallType,
      conversationId: conversationIdRef.current,
    });

    pendingIncomingCall.current = null;

    clearTimers();
    connectingTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "connecting") {
        emitEvent("call-ended", {
          callId,
          targetUserId: remoteUserIdRef.current,
          conversationId: conversationIdRef.current,
          reason: "connection-timeout",
        });
        failCall("The call could not connect.");
      }
    }, 20_000);
  };

  const endCall = useCallback(() => {
    if (socket && callStateRef.current !== "idle") {
      emitEvent("call-ended", {
        callId: activeCallIdRef.current,
        targetUserId: remoteUserIdRef.current,
        callType: callTypeRef.current,
        conversationId: conversationIdRef.current,
        reason: "ended",
      });
    }

    cleanup();
  }, [cleanup, emitEvent, socket]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      syncVideoElements();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [callState, syncVideoElements]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async (data: IncomingCallPayload) => {
      const callId = data.callId || `legacy-${Date.now()}-${Math.random()}`;
      const callerUserId = data.callerUserId;
      if (!callerUserId) return;

      if (callStateRef.current !== "idle") {
        emitEvent("call-rejected", {
          callId,
          callerUserId,
          reason: "busy",
          callType: resolveCallType(data.callType),
          conversationId: data.conversationId,
        });
        return;
      }

      const incomingType = resolveCallType(data.callType);
      pendingIncomingCall.current = { ...data, callId };
      activeCallIdRef.current = callId;
      conversationIdRef.current = data.conversationId;
      setCallTypeSafe(incomingType);
      setRemoteUserIdSafe(callerUserId);
      setIncomingCallerId(callerUserId);
      setPeerName(data.callerName || "Incoming call");
      setPeerImage(undefined);
      setCallError(null);
      setCallStateSafe("receiving");
      clearTimers();
    };

    const handleCallAccepted = async (data: CallAcceptedPayload) => {
      if (callStateRef.current !== "calling") return;

      const { callId, calleeUserId } = data;
      if (!callId) return;

      clearTimers();
      activeCallIdRef.current = callId;
      conversationIdRef.current = data.conversationId || conversationIdRef.current;
      setCallTypeSafe(resolveCallType(data.callType || callTypeRef.current));
      setRemoteUserIdSafe(calleeUserId || remoteUserIdRef.current);
      setCallStateSafe("connecting");

      const pc = createPeerConnection(callId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emitEvent("webrtc-offer", { callId, offer });
      } catch (error) {
        console.error("[WebRTC] Failed creating/sending offer:", error);
        emitEvent("call-ended", {
          callId,
          reason: "connection-timeout",
          conversationId: conversationIdRef.current,
        });
        failCall("The call could not connect.");
        return;
      }

      connectingTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "connecting") {
          emitEvent("call-ended", {
            callId,
            targetUserId: remoteUserIdRef.current,
            conversationId: conversationIdRef.current,
            reason: "connection-timeout",
          });
          failCall("The call could not connect.");
        }
      }, 20_000);
    };

    const handleOffer = async (data: OfferPayload) => {
      if (!data.callId || !data.offer) return;
      if (activeCallIdRef.current && activeCallIdRef.current !== data.callId)
        return;

      activeCallIdRef.current = data.callId;
      setCallStateSafe("connecting");

      const pc = createPeerConnection(data.callId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushPendingIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emitEvent("webrtc-answer", { callId: data.callId, answer });
      } catch (error) {
        console.error("[WebRTC] Failed handling offer:", error);
        emitEvent("call-ended", {
          callId: data.callId,
          reason: "connection-timeout",
          conversationId: conversationIdRef.current,
        });
        failCall("The call could not connect.");
        return;
      }

      clearTimers();
      connectingTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "connecting") {
          failCall("The call could not connect.");
        }
      }, 20_000);
    };

    const handleAnswer = async (
      data:
        | AnswerPayload
        | { answer: RTCSessionDescriptionInit; callId?: string },
    ) => {
      const callId =
        "callId" in data && data.callId ? data.callId : activeCallIdRef.current;
      if (
        callId &&
        activeCallIdRef.current &&
        callId !== activeCallIdRef.current
      )
        return;

      if (!data.answer || !peerConnection.current) return;

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
        await flushPendingIceCandidates();
        clearTimers();
        setCallStateSafe("in_call");
      } catch (error) {
        console.error("[WebRTC] Failed handling answer:", error);
        failCall("The call could not connect.");
      }
    };

    const handleIceCandidate = async (
      data:
        | IcePayload
        | {
            senderUserId?: string;
            callId?: string;
            candidate: RTCIceCandidateInit;
          },
    ) => {
      const callId = "callId" in data ? data.callId : undefined;
      if (
        callId &&
        activeCallIdRef.current &&
        callId !== activeCallIdRef.current
      )
        return;

      const { candidate } = data;
      if (!candidate) return;

      if (
        !peerConnection.current ||
        !peerConnection.current.remoteDescription
      ) {
        pendingIceCandidates.current.push(candidate);
        return;
      }

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      } catch (error) {
        console.error("[WebRTC] Failed to add ICE candidate:", error);
      }
    };

    const handleCallEnded = (data: CallTerminalPayload = {}) => {
      if (data.reason && data.reason !== "ended") {
        failCall(reasonMessage(data.reason));
        return;
      }
      cleanup();
    };

    const handleCallFailed = (data: CallTerminalPayload = {}) => {
      failCall(reasonMessage(data.reason));
    };

    const handleCallRejected = (data: CallTerminalPayload = {}) => {
      failCall(reasonMessage(data.reason || "declined"));
    };

    const handleSocketDisconnect = () => {
      if (callStateRef.current !== "idle") {
        failCall("Socket disconnected during the call.");
      }
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-failed", handleCallFailed);
    socket.on("disconnect", handleSocketDisconnect);

    syncVideoElements();

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-failed", handleCallFailed);
      socket.off("disconnect", handleSocketDisconnect);
    };
  }, [
    socket,
    cleanup,
    createPeerConnection,
    emitEvent,
    failCall,
    flushPendingIceCandidates,
    syncVideoElements,
    clearTimers,
  ]);

  return {
    callState,
    callType,
    callError,
    remoteUserId,
    incomingCallerId,
    peerName,
    peerImage,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  };
};
