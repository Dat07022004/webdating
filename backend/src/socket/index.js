import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { socketAuthMiddleware } from "../middleware/socketMiddleware.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { removeUser } from "./onlineUsers.js";
import { ENV } from "../config/env.js";
import { connectRedis, createRedisDuplicate } from "../config/redis.js";

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

async function setupRedisAdapter(socketServer) {
  const pubClient = await connectRedis();

  if (!pubClient) {
    console.log("[Socket] Redis adapter disabled");
    return;
  }

  const subClient = await createRedisDuplicate();
  if (!subClient) {
    console.warn("[Socket] Redis adapter disabled: missing subscriber");
    return;
  }

  socketServer.adapter(createAdapter(pubClient, subClient));
  console.log("[Socket] Redis adapter enabled");
}

export async function initSocket(server) {
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

  await setupRedisAdapter(io);

  // Use middleware for authentication
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
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
