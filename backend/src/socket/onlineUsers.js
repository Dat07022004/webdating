const onlineUsers = new Map();

export function addUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

export function removeUser(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
}

export function getSocketIds(userId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return [];
  return Array.from(sockets);
}

export function getSocketId(userId) {
  const ids = getSocketIds(userId);
  return ids.length > 0 ? ids[0] : null;
}

export function isOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

export function getAllOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}
