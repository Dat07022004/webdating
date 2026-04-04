import { Server } from "socket.io";
import { socketAuthMiddleware } from "./socketMiddleware.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { removeUser } from "./onlineUsers.js";

let io;

const defaultAllowedOrigins = [
  "https://heartly-webdating-frontend-8h1el.sevalla.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins]),
);

const isDynamicAllowedOrigin = (origin) => {
  return (
    /\.trycloudflare\.com$/i.test(origin) || /\.sevalla\.app$/i.test(origin)
  );
};

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const isAllowed =
          allowedOrigins.includes(origin) || isDynamicAllowedOrigin(origin);

        callback(null, isAllowed);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
    },
  });

  // Use middleware for authentication
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.userName;

    console.log(
      `[Socket] User connected: ${userName} (${userId}) - Socket: ${socket.id}`,
    );

    // Đăng ký các sự kiện liên quan đến chat (nhận tin nhắn, webrtc)
    registerChatHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(
        `[Socket] User disconnected: ${userName} (${userId}) - Socket: ${socket.id}`,
      );
      removeUser(userId, socket.id);

      // Emit event tới các user khác nếu cần thiết (vd: user offline)
      // io.emit('user_offline', { userId });
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}
