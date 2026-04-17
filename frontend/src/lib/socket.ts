import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      // console.log("[Socket] Connected with id:", socket?.id);
    });

    socket.on("connect_error", (error) => {
      // console.error("[Socket] Connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      // console.log("[Socket] Disconnected:", reason);
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
