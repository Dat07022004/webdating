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

const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ];

  const turnUrlsRaw = import.meta.env.VITE_TURN_URLS as string | undefined;
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as
    | string
    | undefined;

  const parsedTurnUrls = (turnUrlsRaw || turnUrl || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsedTurnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({
      urls: parsedTurnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  } else {
    // Fallback TURN for quick connectivity across strict NAT/firewall networks.
    // Replace with your own TURN in production for stability and security control.
    servers.push({
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turns:openrelay.metered.ca:443",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    });
  }

  if (import.meta.env.PROD && parsedTurnUrls.length === 0) {
    console.warn(
      "[WebRTC] Using public TURN fallback. Configure VITE_TURN_URLS/VITE_TURN_USERNAME/VITE_TURN_CREDENTIAL for production reliability.",
    );
  }

  return servers;
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
  const remotePlayAttemptRef = useRef(0);
  const iceRestartAttemptedRef = useRef(false);

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

  const playRemoteVideo = useCallback(async () => {
    const video = remoteVideoRef.current;
    if (!video || !video.srcObject) return;

    const attemptId = ++remotePlayAttemptRef.current;
    try {
      await video.play();
    } catch (error) {
      const err = error as { name?: string; message?: string };

      // srcObject changes can interrupt play; retry once after render settles.
      if (err?.name === "AbortError") {
        window.setTimeout(() => {
          if (attemptId === remotePlayAttemptRef.current) {
            void video.play().catch((retryError) => {
              console.warn(
                "[WebRTC] remote video retry play failed:",
                retryError,
              );
            });
          }
        }, 120);
        return;
      }

      console.warn("[WebRTC] remote video play failed:", error);
    }
  }, []);

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

    const currentSrc = remoteVideoRef.current.srcObject as MediaStream | null;
    const isSameStream =
      currentSrc &&
      currentSrc.id === stream.id &&
      currentSrc.getTracks().length === stream.getTracks().length;

    if (!isSameStream) {
      remoteVideoRef.current.srcObject = stream;
    }

    await playRemoteVideo();
  };

  const ensureRemoteStream = () => {
    if (!remoteStream.current) {
      remoteStream.current = new MediaStream();
    }
    return remoteStream.current;
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
    iceRestartAttemptedRef.current = false;

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
    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach((track) => {
        track.stop();
        remoteStream.current?.removeTrack(track);
      });
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
        iceServers: buildIceServers(),
        iceTransportPolicy:
          import.meta.env.VITE_FORCE_RELAY === "true" ? "relay" : "all",
        iceCandidatePoolSize: 10,
      });

      pc.onicecandidate = (event) => {
        if (!event.candidate || !callId) return;

        emitEvent("webrtc-ice-candidate", {
          callId,
          candidate: event.candidate,
        });
      };

      const inboundRemoteStream = ensureRemoteStream();
      void attachRemoteStream(inboundRemoteStream);

      pc.ontrack = (event) => {
        const stream = ensureRemoteStream();
        const hasTrack = stream
          .getTracks()
          .some((track) => track.id === event.track.id);
        if (!hasTrack) {
          stream.addTrack(event.track);
        }

        event.track.onunmute = () => {
          void attachRemoteStream(stream);
        };

        void attachRemoteStream(stream);
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log("[WebRTC] iceConnectionState:", iceState);

        if (
          (iceState === "disconnected" || iceState === "failed") &&
          !iceRestartAttemptedRef.current
        ) {
          iceRestartAttemptedRef.current = true;
          pc.createOffer({ iceRestart: true })
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              emitEvent("webrtc-offer", { callId, offer });
            })
            .catch((error) => {
              console.error("[WebRTC] ICE restart failed:", error);
            });
        }

        if (iceState === "failed") {
          console.error(
            "[WebRTC] ICE failed. Check TURN config for this environment.",
          );
        }
      };

      pc.onicecandidateerror = (event) => {
        console.error("[WebRTC] ICE candidate error:", {
          address: event.address,
          port: event.port,
          url: event.url,
          errorCode: event.errorCode,
          errorText: event.errorText,
        });
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
    [cleanup, clearTimers, emitEvent, playRemoteVideo],
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
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
      }, 45_000);
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
      }, 45_000);
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
