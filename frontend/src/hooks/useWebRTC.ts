import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";

export type CallState =
  | "idle"
  | "calling"
  | "receiving"
  | "connecting"
  | "in_call";

type IncomingCallPayload = {
  callId: string;
  callerUserId: string;
};

type CallAcceptedPayload = {
  callId: string;
  calleeUserId: string;
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

export const useWebRTC = () => {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteUserId, setRemoteUserIdState] = useState<string | null>(null);
  const [incomingCallerId, setIncomingCallerId] = useState<string | null>(null);

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

  const remoteUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");

  const setCallStateSafe = (state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  };

  const setRemoteUserIdSafe = (id: string | null) => {
    remoteUserIdRef.current = id;
    setRemoteUserIdState(id);
  };

  const clearRemoteMediaElement = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

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
        console.warn("[WebRTC] remote video play failed:", error);
      });
    }
  }, []);

  const attachRemoteStream = async (stream: MediaStream) => {
    remoteStream.current = stream;
    if (!remoteVideoRef.current) return;

    stream.getTracks().forEach((track) => {
      if (!track.enabled) {
        track.enabled = true;
      }
    });

    if (remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
    }

    try {
      await remoteVideoRef.current.play();
    } catch (error) {
      console.warn("[WebRTC] remote video play failed:", error);
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

  const clearTimers = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
        localStream.current?.removeTrack(track);
      });
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    pendingIncomingCall.current = null;
    pendingIceCandidates.current = [];
    remoteStream.current = null;
    activeCallIdRef.current = null;
    setCallStateSafe("idle");
    setRemoteUserIdSafe(null);
    setIncomingCallerId(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    clearRemoteMediaElement();
  }, [clearTimers]);

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
        const remoteStream = event.streams[0];
        if (remoteStream) {
          void attachRemoteStream(remoteStream);
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
          cleanup();
        }

        if (connectionState === "closed" && callStateRef.current !== "idle") {
          cleanup();
        }
      };

      if (localStream.current) {
        const existingTrackIds = new Set(
          pc.getSenders().map((sender) => sender.track?.id),
        );
        localStream.current.getTracks().forEach((track) => {
          if (localStream.current) {
            if (!existingTrackIds.has(track.id)) {
              pc.addTrack(track, localStream.current);
            }
          }
        });
      }

      peerConnection.current = pc;
      return pc;
    },
    [cleanup, clearTimers, emitEvent],
  );

  const initLocalStream = async () => {
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
        video: true,
        audio: true,
      });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return true;
    } catch (e) {
      console.error("Failed to get media devices:", e);
      return false;
    }
  };

  const startCall = async (targetUserId: string) => {
    if (!socket || callStateRef.current !== "idle") return;

    const success = await initLocalStream();
    if (!success) return;

    setRemoteUserIdSafe(targetUserId);
    setCallStateSafe("calling");

    emitEvent("call-user", { targetUserId });

    // Ring timeout: auto-stop if nobody accepts in 30s.
    clearTimers();
    ringTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "calling") {
        cleanup();
      }
    }, 30_000);
  };

  const answerCall = async () => {
    if (!socket || !pendingIncomingCall.current || !remoteUserIdRef.current)
      return;

    const success = await initLocalStream();
    if (!success) {
      alert("CĂNG RỒI: Không xin được quyền mở Camera hoặc Mic trên máy này!");
      rejectCall();
      return;
    }

    const { callId } = pendingIncomingCall.current;
    activeCallIdRef.current = callId;
    setCallStateSafe("connecting");
    createPeerConnection(callId);

    emitEvent("call-accepted", {
      callId,
      callerUserId: remoteUserIdRef.current,
    });

    pendingIncomingCall.current = null;

    clearTimers();
    connectingTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "connecting") {
        cleanup();
      }
    }, 20_000);
  };

  const rejectCall = useCallback(() => {
    if (!socket) {
      cleanup();
      return;
    }

    if (pendingIncomingCall.current) {
      emitEvent("call-rejected", {
        callId: pendingIncomingCall.current.callId,
        callerUserId: pendingIncomingCall.current.callerUserId,
        reason: "declined",
      });
    } else if (activeCallIdRef.current) {
      emitEvent("call-rejected", {
        callId: activeCallIdRef.current,
        callerUserId: remoteUserIdRef.current,
        reason: "declined",
      });
    }

    cleanup();
  }, [cleanup, emitEvent, socket]);

  const endCall = useCallback(() => {
    if (socket && callStateRef.current !== "idle") {
      emitEvent("call-ended", {
        callId: activeCallIdRef.current,
        targetUserId: remoteUserIdRef.current,
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

    const handleIncomingCall = async (
      data:
        | IncomingCallPayload
        | {
            callerUserId: string;
            callId?: string;
          },
    ) => {
      const callId =
        "callId" in data && data.callId
          ? data.callId
          : `legacy-${Date.now()}-${Math.random()}`;
      const callerUserId = data.callerUserId;

      if (!callerUserId) return;

      if (callStateRef.current !== "idle") {
        emitEvent("call-rejected", { callId, callerUserId, reason: "busy" });
        return;
      }

      pendingIncomingCall.current = { callId, callerUserId };
      activeCallIdRef.current = callId;
      setRemoteUserIdSafe(callerUserId);
      setIncomingCallerId(callerUserId);
      setCallStateSafe("receiving");

      clearTimers();
    };

    const handleCallAccepted = async (data: CallAcceptedPayload) => {
      if (callStateRef.current !== "calling") return;

      const { callId, calleeUserId } = data;
      if (!callId) return;

      clearTimers();
      activeCallIdRef.current = callId;
      setRemoteUserIdSafe(calleeUserId || remoteUserIdRef.current);
      setCallStateSafe("connecting");

      const success = await initLocalStream();
      if (!success) {
        emitEvent("call-ended", { callId, reason: "media-failed" });
        cleanup();
        return;
      }

      const pc = createPeerConnection(callId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emitEvent("webrtc-offer", { callId, offer });
      } catch (error) {
        console.error("[WebRTC] Failed creating/sending offer:", error);
        cleanup();
        return;
      }

      connectingTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "connecting") {
          cleanup();
        }
      }, 20_000);
    };

    const handleOffer = async (data: OfferPayload) => {
      if (!data.callId) return;
      if (!data.offer) return;
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
        cleanup();
        return;
      }

      clearTimers();
      connectingTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === "connecting") {
          cleanup();
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

      if (!data.answer) return;

      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
          await flushPendingIceCandidates();
          clearTimers();
          setCallStateSafe("in_call");
        } catch (error) {
          console.error("[WebRTC] Failed handling answer:", error);
          cleanup();
        }
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

    const handleCallEnded = () => {
      cleanup();
    };

    const handleCallFailed = () => {
      cleanup();
    };

    const handleCallRejected = () => {
      cleanup();
    };

    const handleSocketDisconnect = () => {
      if (callStateRef.current !== "idle") {
        cleanup();
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
    flushPendingIceCandidates,
    syncVideoElements,
  ]);

  return {
    callState,
    remoteUserId,
    incomingCallerId,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  };
};
