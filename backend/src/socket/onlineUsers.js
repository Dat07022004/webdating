/**
 * Online Users Manager
 *
 * Quản lý danh sách user đang online.
 * Dùng Map<userId(MongoDB ObjectId string), Set<socketId>>
 * để hỗ trợ trường hợp 1 user mở nhiều tab.
 *
 * userId ở đây là MongoDB _id (string) của User document.
 */

/** @type {Map<string, Set<string>>} */
const onlineUsers = new Map();

/**
 * Thêm user vào danh sách online.
 * @param {string} userId - MongoDB _id của user
 * @param {string} socketId - socket.id của connection này
 */
export function addUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

/**
 * Xóa một socketId khỏi user (khi 1 tab đóng).
 * Nếu user không còn socket nào → xóa khỏi map (user offline).
 * @param {string} userId
 * @param {string} socketId
 */
export function removeUser(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
}

/**
 * Lấy tất cả socketId của một user (multi-tab).
 * @param {string} userId
 * @returns {string[]} Mảng socketId
 */
export function getSocketIds(userId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return [];
  return Array.from(sockets);
}

/**
 * Lấy socketId đầu tiên của user (để gửi private message).
 * @param {string} userId
 * @returns {string | null}
 */
export function getSocketId(userId) {
  const ids = getSocketIds(userId);
  return ids.length > 0 ? ids[0] : null;
}

/**
 * Kiểm tra user có đang online không.
 * @param {string} userId
 * @returns {boolean}
 */
export function isOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

/**
 * Lấy danh sách tất cả userId đang online.
 * @returns {string[]}
 */
export function getAllOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}
