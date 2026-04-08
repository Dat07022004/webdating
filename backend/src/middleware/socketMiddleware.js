import { verifyToken } from "@clerk/express";
import { ENV } from "../config/env.js";
import { User } from "../models/user.model.js";
import { isUserActivelyBanned } from "../services/admin.service.js";

export async function socketAuthMiddleware(socket, next) {
  try {
    // Lấy token từ handshake — frontend gửi qua socket({ auth: { token } })
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("SOCKET_AUTH_ERROR: No token provided"));
    }

    // Verify token với Clerk — trả về payload nếu hợp lệ
    const payload = await verifyToken(token, {
      secretKey: ENV.CLERK_SECRET_KEY,
      clockSkewInMs: 5 * 60 * 1000, // 5 minutes allow
    });

    if (!payload || !payload.sub) {
      return next(new Error("SOCKET_AUTH_ERROR: Invalid token"));
    }

    const clerkId = payload.sub;

    // Tìm user trong MongoDB bằng clerkId
    const user = await User.findOne({ clerkId }).select(
      "_id clerkId profile.personalInfo.name status",
    );

    if (!user) {
      return next(new Error("SOCKET_AUTH_ERROR: User not found"));
    }

    const activeBan = await isUserActivelyBanned(user._id);
    if (activeBan) {
      return next(new Error("SOCKET_AUTH_ERROR: Account is banned"));
    }

    // Gắn thông tin user vào socket để dùng trong handlers
    socket.data.userId = user._id.toString();
    socket.data.clerkId = clerkId;
    socket.data.userName = user.profile?.personalInfo?.name || "Unknown";

    next();
  } catch (err) {
    console.error("[SocketAuth] Token verification failed:", err.message);
    next(new Error("SOCKET_AUTH_ERROR: Token verification failed"));
  }
}
