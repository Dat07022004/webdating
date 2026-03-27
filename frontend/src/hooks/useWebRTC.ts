import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';

export type CallState = 'idle' | 'calling' | 'receiving' | 'in_call';

export const useWebRTC = () => {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteUserId, setRemoteUserIdState] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  
  const remoteUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>('idle');

  const setCallStateSafe = (state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  };

  const setRemoteUserIdSafe = (id: string | null) => {
    remoteUserIdRef.current = id;
    setRemoteUserIdState(id);
  };

  const cleanup = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
        localStream.current?.removeTrack(track);
      });
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setCallStateSafe('idle');
    setRemoteUserIdSafe(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserId && socket) {
        socket.emit('ice_candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        if (localStream.current) {
          pc.addTrack(track, localStream.current);
        }
      });
    }

    peerConnection.current = pc;
    return pc;
  }, [socket]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return true;
    } catch (e) {
      console.error('Failed to get media devices:', e);
      return false;
    }
  };

  const startCall = async (targetUserId: string) => {
    if (!socket) return;
    const success = await initLocalStream();
    if (!success) return;

    setRemoteUserIdSafe(targetUserId);
    setCallStateSafe('calling');
    
    const pc = createPeerConnection(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call_user', { targetUserId, offer });
  };

  const answerCall = async () => {
    if (!socket || !remoteUserIdRef.current) return;
    const success = await initLocalStream();
    if (!success) return;

    setCallStateSafe('in_call');
    
    if (localStream.current && peerConnection.current) {
       localStream.current.getTracks().forEach(track => {
          if (localStream.current) {
             peerConnection.current?.addTrack(track, localStream.current);
          }
       });
    }

    if (peerConnection.current) {
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('answer_call', {
        callerUserId: remoteUserIdRef.current,
        answer
      });
    }
  };

  const rejectCall = () => {
    if (!socket || !remoteUserIdRef.current) return;
    socket.emit('call_rejected', { callerUserId: remoteUserIdRef.current });
    cleanup();
  };

  const endCall = () => {
    if (socket && remoteUserIdRef.current && callStateRef.current !== 'idle') {
      socket.emit('end_call', { targetUserId: remoteUserIdRef.current });
    }
    cleanup();
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async (data: { callerUserId: string, offer: RTCSessionDescriptionInit }) => {
      const { callerUserId, offer } = data;
      if (callStateRef.current !== 'idle') {
        socket.emit('call_rejected', { callerUserId });
        return;
      }

      setRemoteUserIdSafe(callerUserId);
      setCallStateSafe('receiving');
      
      const pc = createPeerConnection(callerUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
    };

    const handleCallAnswered = async (data: { answer: RTCSessionDescriptionInit }) => {
      const { answer } = data;
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStateSafe('in_call');
      }
    };

    const handleIceCandidate = async (data: { senderUserId: string, candidate: RTCIceCandidateInit }) => {
      const { candidate } = data;
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', cleanup);
    socket.on('call_rejected', cleanup);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', cleanup);
      socket.off('call_rejected', cleanup);
    };
  }, [socket, cleanup, createPeerConnection]);

  return {
    callState,
    remoteUserId,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall
  };
};
