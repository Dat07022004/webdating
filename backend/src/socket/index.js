import { Server } from "socket.io";
import { socketAuthMiddleware } from "./socketMiddleware.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { removeUser } from "./onlineUsers.js";
import { ENV } from "../config/env.js";

let io;

const defaultAllowedOrigins = [
  "https://heartly-webdating-frontend-8h1e1.sevalla.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, "");

const allowedOrigins = new Set(
  [ENV.ALLOWED_ORIGINS, ENV.FRONTEND_URL]
    .flatMap((value) => {
      if (!value) return [];

      if (value.trim() === "*") {
        return ["*"];
      }

      return value
        .split(",")
        .map((item) => normalizeOrigin(item))
        .filter(Boolean);
    })
    .concat(defaultAllowedOrigins.map((origin) => normalizeOrigin(origin))),
);

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.has("*") ||
          allowedOrigins.has(normalizeOrigin(origin))
        ) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      methods: ["GET", "POST", "OPTIONS"],
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
