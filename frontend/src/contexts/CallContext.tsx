import React, { createContext, useContext } from "react";
import { VideoCallModal } from "@/components/chat/VideoCallModal";
import { CallType, useWebRTC } from "@/hooks/useWebRTC";

type StartCallOptions = {
  conversationId?: string;
  peerName?: string;
  peerImage?: string;
};

type CallContextValue = ReturnType<typeof useWebRTC> & {
  startCall: (
    targetUserId: string,
    callType?: CallType,
    options?: StartCallOptions,
  ) => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const call = useWebRTC();

  return (
    <CallContext.Provider value={call}>
      {children}
      <VideoCallModal
        callState={call.callState}
        callType={call.callType}
        callError={call.callError}
        localVideoRef={call.localVideoRef}
        remoteVideoRef={call.remoteVideoRef}
        onEndCall={call.endCall}
        onRejectCall={call.rejectCall}
        onAnswerCall={call.answerCall}
        callerName={call.peerName}
        callerImage={call.peerImage}
      />
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};
