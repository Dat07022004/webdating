import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { initializeSocket, disconnectSocket, getSocket } from '../lib/socket';

export const useSocket = () => {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let unmounted = false;

    const setupSocket = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token && !unmounted) {
            const socket = initializeSocket(token);
            
            socket.on('connect', () => setIsConnected(true));
            socket.on('disconnect', () => setIsConnected(false));
            
            setIsConnected(socket.connected);
          }
        } catch (error) {
          console.error('Failed to get Clerk token for socket:', error);
        }
      } else {
        disconnectSocket();
        setIsConnected(false);
      }
    };

    setupSocket();

    return () => {
      unmounted = true;
    };
  }, [isSignedIn, getToken]);

  return { socket: getSocket(), isConnected };
};
