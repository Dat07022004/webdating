import { getRedisClient } from "../config/redis.js";

const onlineUsers = new Map();
const ONLINE_KEY_PREFIX = "socket:online:user:";
const SOCKET_USER_KEY_PREFIX = "socket:user:";
const ONLINE_TTL_SECONDS = 60 * 60 * 24;

const onlineKey = (userId) => `${ONLINE_KEY_PREFIX}${userId}`;
const socketUserKey = (socketId) => `${SOCKET_USER_KEY_PREFIX}${socketId}`;

export function addUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);

  const redis = getRedisClient();
  if (redis) {
    redis
      .multi()
      .sAdd(onlineKey(userId), socketId)
      .expire(onlineKey(userId), ONLINE_TTL_SECONDS)
      .set(socketUserKey(socketId), userId, { EX: ONLINE_TTL_SECONDS })
      .exec()
      .catch((error) => {
        console.error("[Socket] Failed to store online user:", error.message);
      });
  }
}

export function removeUser(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }

  const redis = getRedisClient();
  if (redis) {
    redis
      .multi()
      .sRem(onlineKey(userId), socketId)
      .del(socketUserKey(socketId))
      .exec()
      .catch((error) => {
        console.error("[Socket] Failed to remove online user:", error.message);
      });
  }
}

export async function getSocketIds(userId) {
  const sockets = onlineUsers.get(userId);
  const localSocketIds = sockets ? Array.from(sockets) : [];
  const redis = getRedisClient();

  if (!redis) {
    return localSocketIds;
  }

  try {
    const redisSocketIds = await redis.sMembers(onlineKey(userId));
    return Array.from(new Set([...localSocketIds, ...redisSocketIds]));
  } catch (error) {
    console.error("[Socket] Failed to load online user:", error.message);
    return localSocketIds;
  }
}

export async function getSocketId(userId) {
  const ids = await getSocketIds(userId);
  return ids.length > 0 ? ids[0] : null;
}

export async function isOnline(userId) {
  const ids = await getSocketIds(userId);
  return ids.length > 0;
}

export async function getAllOnlineUserIds() {
  const localUserIds = Array.from(onlineUsers.keys());
  const redis = getRedisClient();

  if (!redis) {
    return localUserIds;
  }

  try {
    const keys = await redis.keys(`${ONLINE_KEY_PREFIX}*`);
    const redisUserIds = keys.map((key) => key.replace(ONLINE_KEY_PREFIX, ""));
    return Array.from(new Set([...localUserIds, ...redisUserIds]));
  } catch (error) {
    console.error("[Socket] Failed to load online users:", error.message);
    return localUserIds;
  }
}
