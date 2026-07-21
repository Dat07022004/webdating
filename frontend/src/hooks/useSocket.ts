import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { initializeSocket, disconnectSocket, getSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

export const useSocket = () => {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(
    getSocket(),
  );

  useEffect(() => {
    let unmounted = false;
    let activeSocket: Socket | null = null;

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const setupSocket = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token && !unmounted) {
            activeSocket = initializeSocket(token);
            setSocketInstance(activeSocket);

            activeSocket.off("connect", handleConnect);
            activeSocket.off("disconnect", handleDisconnect);
            activeSocket.on("connect", handleConnect);
            activeSocket.on("disconnect", handleDisconnect);

            setIsConnected(activeSocket.connected);
          }
        } catch (error) {
          console.error("Failed to get Clerk token for socket:", error);
        }
      } else {
        disconnectSocket();
        setSocketInstance(null);
        setIsConnected(false);
      }
    };

    setupSocket();

    return () => {
      unmounted = true;
      if (activeSocket) {
        activeSocket.off("connect", handleConnect);
        activeSocket.off("disconnect", handleDisconnect);
      }
    };
  }, [isSignedIn, getToken]);

  return { socket: socketInstance, isConnected };
};
