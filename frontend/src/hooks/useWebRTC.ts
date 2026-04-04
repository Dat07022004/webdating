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

  // FIX #2: remoteStream qua React State để trigger useEffect gán lại srcObject
  // khi remoteVideoRef đã sẵn sàng trên DOM.
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  // Ref vẫn dùng để tránh closure stale bên trong các callback PC
  const remoteStreamRef = useRef<MediaStream | null>(null);
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

  // hoặc khi callState thay đổi (đảm bảo ref đã mount trên DOM).
  useEffect(() => {
    if (!remoteStream) return;
    const video = remoteVideoRef.current;
    if (!video) return;

    if (video.srcObject !== remoteStream) {
      console.log("[WebRTC] useEffect: gán remoteStream vào remoteVideoRef");
      video.srcObject = remoteStream;
    }

    const attemptId = ++remotePlayAttemptRef.current;
    video.play().catch((err: { name?: string }) => {
      if (err?.name === "AbortError") {
        window.setTimeout(() => {
          if (attemptId === remotePlayAttemptRef.current) {
            void video.play().catch((retryErr) => {
              console.warn("[WebRTC] remote video retry play failed:", retryErr);
            });
          }
        }, 120);
      } else {
        console.warn("[WebRTC] remote video play failed:", err);
      }
    });
  }, [remoteStream, callState]);

  // Sync local video
  useEffect(() => {
    if (localStream.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    }
  }, [callState]);

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
        console.log("[WebRTC] Flushed buffered ICE candidate");
      } catch (error) {
        console.error("[WebRTC] Failed to add buffered ICE candidate:", error);
      }
    }
  }, []);

  const emitEvent = useCallback(
    (eventName: string, payload: Record<string, unknown>) => {
      if (!socket) return;
      console.log(`[WebRTC] emit: ${eventName}`, payload);
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
      });
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
    }
    pendingIncomingCall.current = null;
    pendingIceCandidates.current = [];
    activeCallIdRef.current = null;
    setCallStateSafe("idle");
    setRemoteUserIdSafe(null);
    setIncomingCallerId(null);
    setRemoteStream(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [clearTimers]);

  // Assign stream vào video element trực tiếp và cập nhật state.
  // QUAN TRỌNG: luôn tạo wrapper object mới { stream } để React
  // detect được thay đổi kể cả khi stream reference giống nhau.
  const applyRemoteStream = useCallback((stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      if (!track.enabled) track.enabled = true;
    });
    remoteStreamRef.current = stream;

    console.log(
      "[WebRTC] applyRemoteStream, tracks:",
      stream.getTracks().map((t) => `${t.kind}:${t.readyState}`).join(", "),
    );

    // Path 1: Gán trực tiếp nếu ref đã mount
    if (remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== stream) {
        remoteVideoRef.current.srcObject = stream;
        console.log("[WebRTC] srcObject gán trực tiếp vào ref");
      }
      void remoteVideoRef.current.play().catch(() => {});
    }

    // Path 2: Lưu state để useEffect gán lại khi ref mount (nếu chưa mount)
    // Bọc trong object mới để React luôn trigger re-render
    setRemoteStream(new MediaStream(stream.getTracks()));
  }, []);

  // FIX #1: Thêm local tracks vào PeerConnection
  // Hàm này được gọi TƯỜNG MINH sau khi initLocalStream() resolve thành công,
  // đảm bảo tracks được add TRƯỚC KHI createOffer/createAnswer.
  const addLocalTracksToPeer = useCallback((pc: RTCPeerConnection) => {
    if (!localStream.current) {
      console.warn("[WebRTC] addLocalTracksToPeer: localStream chưa sẵn sàng!");
      return;
    }
    const existingTrackIds = new Set(
      pc.getSenders().map((sender) => sender.track?.id),
    );
    localStream.current.getTracks().forEach((track) => {
      if (!existingTrackIds.has(track.id) && localStream.current) {
        pc.addTrack(track, localStream.current);
        console.log(`[WebRTC] Added local ${track.kind} track to PC`);
      }
    });
  }, []);

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

      // FIX #3: Gửi ICE candidate qua socket đến đúng bên kia
      pc.onicecandidate = (event) => {
        if (!event.candidate || !callId) return;
        console.log("[WebRTC] onicecandidate: gửi candidate");
        emitEvent("webrtc-ice-candidate", {
          callId,
          candidate: event.candidate.toJSON(),
        });
      };

      // ontrack: dùng event.streams[0] (WebRTC đã bundle đủ tracks)
      // Assign thẳng vào ref + update state để xử lý mọi timing
      pc.ontrack = (event) => {
        console.log(
          "[WebRTC] ontrack:",
          event.track.kind,
          "readyState:",
          event.track.readyState,
          "streams:",
          event.streams.length,
        );

        // Ưu tiên stream có sẵn từ event (đã bundle audio+video)
        const stream =
          event.streams[0] ||
          (() => {
            if (!remoteStreamRef.current) {
              remoteStreamRef.current = new MediaStream();
            }
            if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
              remoteStreamRef.current.addTrack(event.track);
            }
            return remoteStreamRef.current;
          })();

        applyRemoteStream(stream);

        // Khi track unmute (data bắt đầu flow), apply lại
        event.track.onunmute = () => {
          console.log(`[WebRTC] Remote ${event.track.kind} unmuted - reapplying stream`);
          applyRemoteStream(stream);
        };
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
        console.log("[WebRTC] connectionState:", connectionState);
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

      // KHÔNG add tracks ở đây nữa — addLocalTracksToPeer() được gọi tường minh
      // sau initLocalStream() để đảm bảo thứ tự đúng.

      peerConnection.current = pc;
      return pc;
    },
    [cleanup, clearTimers, emitEvent, applyRemoteStream],
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
      console.log(
        "[WebRTC] Local stream ready, tracks:",
        stream.getTracks().map((t) => t.kind).join(", "),
      );
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

    // FIX #1: Init local stream TRƯỚC
    const success = await initLocalStream();
    if (!success) {
      alert("Không thể mở Camera hoặc Mic. Vui lòng kiểm tra quyền truy cập!");
      rejectCall();
      return;
    }

    const { callId } = pendingIncomingCall.current;
    activeCallIdRef.current = callId;
    setCallStateSafe("connecting");

    // FIX #1: Tạo PC và ADD TRACKS vào ngay (localStream đã sẵn sàng)
    const pc = createPeerConnection(callId);
    addLocalTracksToPeer(pc);

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

      // FIX #1: Đảm bảo local stream TỒN TẠI trước
      const success = await initLocalStream();
      if (!success) {
        emitEvent("call-ended", { callId, reason: "media-failed" });
        cleanup();
        return;
      }

      // FIX #1: Tạo PC và ADD TRACKS trước khi createOffer
      const pc = createPeerConnection(callId);
      addLocalTracksToPeer(pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("[WebRTC] Offer created and sent");
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

      console.log("[WebRTC] Received offer, processing...");
      activeCallIdRef.current = data.callId;
      setCallStateSafe("connecting");

      // FIX #1: Đảm bảo local stream có trước khi createAnswer
      // (localStream đã được init bởi answerCall, nhưng double-check để chắc)
      if (!localStream.current) {
        const success = await initLocalStream();
        if (!success) {
          console.error("[WebRTC] Cannot get local stream for answer");
          cleanup();
          return;
        }
      }

      const pc = createPeerConnection(data.callId);

      // FIX #1: ADD TRACKS trước khi createAnswer
      addLocalTracksToPeer(pc);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushPendingIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("[WebRTC] Answer created and sent");
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
          console.log("[WebRTC] Answer handled, now in_call");
        } catch (error) {
          console.error("[WebRTC] Failed handling answer:", error);
          cleanup();
        }
      }
    };

    // FIX #3: Xử lý ICE candidates — buffer nếu remoteDescription chưa set
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
        // Buffer lại để add sau khi setRemoteDescription
        pendingIceCandidates.current.push(candidate);
        console.log("[WebRTC] ICE candidate buffered (no remote desc yet)");
        return;
      }

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
        console.log("[WebRTC] ICE candidate added successfully");
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

    const disconnectTimerRef = { current: null as ReturnType<typeof setTimeout> | null };

    // KHÔNG cleanup ngay khi disconnect — Cloudflare tunnel có thể mất kết nối
    // tạm thời và reconnect lại. Cho 8 giây grace period.
    const handleSocketDisconnect = (reason: string) => {
      console.log("[WebRTC] Socket disconnected:", reason);
      if (callStateRef.current === "idle") return;

      disconnectTimerRef.current = setTimeout(() => {
        // Nếu sau 8s vẫn không reconnect được, kết thúc cuộc gọi
        if (callStateRef.current !== "idle") {
          console.warn("[WebRTC] Socket không reconnect được, kết thúc cuộc gọi");
          cleanup();
        }
      }, 8000);
    };

    const handleSocketReconnect = () => {
      console.log("[WebRTC] Socket reconnected");
      // Xóa timer cleanup nếu reconnect kịp
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
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
    socket.on("connect", handleSocketReconnect);

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-failed", handleCallFailed);
      socket.off("disconnect", handleSocketDisconnect);
      socket.off("connect", handleSocketReconnect);
    };
  }, [
    socket,
    cleanup,
    createPeerConnection,
    addLocalTracksToPeer,
    emitEvent,
    flushPendingIceCandidates,
    applyRemoteStream,
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
