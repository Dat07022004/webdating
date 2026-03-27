import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CallState } from '@/hooks/useWebRTC';

interface VideoCallModalProps {
  callState: CallState;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onEndCall: () => void;
  onRejectCall: () => void;
  onAnswerCall: () => void;
  callerName?: string;
  callerImage?: string;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  callState,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  onRejectCall,
  onAnswerCall,
  callerName = "User",
  callerImage,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);

  if (callState === 'idle') return null;

  const toggleMute = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        {callState === 'receiving' ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-6 p-8 bg-card rounded-2xl shadow-xl w-80"
          >
            <div className="relative">
              <img
                src={callerImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                alt={callerName}
                className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-primary"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-primary/20 pointer-events-none"
              />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{callerName}</h3>
              <p className="text-muted-foreground mt-1">Incoming video call...</p>
            </div>
            <div className="flex gap-4 w-full">
              <Button
                variant="destructive"
                className="flex-1 rounded-full h-12"
                onClick={onRejectCall}
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                Decline
              </Button>
              <Button
                className="flex-1 rounded-full bg-green-500 hover:bg-green-600 h-12"
                onClick={onAnswerCall}
              >
                <Phone className="w-5 h-5 mr-2" />
                Accept
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full h-full md:w-[80vw] md:h-[80vh] md:rounded-3xl bg-black relative overflow-hidden flex flex-col shadow-2xl">
            {/* Remote Video (Full Screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Floating) */}
            <motion.div 
              drag
              dragConstraints={{ left: 0, right: 300, top: 0, bottom: 500 }}
              className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden shadow-xl border-2 border-zinc-800"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Calling Status Overlay */}
            {callState === 'calling' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                 <div className="text-center">
                    <img src={callerImage || ""} alt={callerName} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover opacity-80" />
                    <h2 className="text-2xl text-white font-medium mb-2">Calling {callerName}...</h2>
                    <p className="text-zinc-400">Ringing...</p>
                 </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 px-6 py-4 rounded-full backdrop-blur-md z-20">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full w-12 h-12 ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500' : 'text-white hover:bg-white/20'}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600 shadow-lg"
                onClick={onEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full w-12 h-12 ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500' : 'text-white hover:bg-white/20'}`}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
