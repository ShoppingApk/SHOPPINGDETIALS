// Shared Socket.IO state: the io instance and in-memory presence (userId -> Set of socket ids).
// Supports several tabs/devices per user. Note: in-memory state assumes a single server
// instance (true on Render's free tier).
let io = null;
const presence = new Map();

const room = (userId) => `user:${userId}`;

module.exports = {
  room,
  setIO(instance) {
    io = instance;
  },
  getIO: () => io,

  // Returns true if this was the user's first connection (they just came online).
  addSocket(userId, socketId) {
    const set = presence.get(userId) || new Set();
    const first = set.size === 0;
    set.add(socketId);
    presence.set(userId, set);
    return first;
  },
  // Returns true if this was the user's last connection (they just went offline).
  removeSocket(userId, socketId) {
    const set = presence.get(userId);
    if (!set) return false;
    set.delete(socketId);
    if (set.size === 0) {
      presence.delete(userId);
      return true;
    }
    return false;
  },
  isOnline: (userId) => presence.has(String(userId)),
  // Socket ids of a user's connected tabs. A socket only exists while the chat is unlocked.
  socketsOf: (userId) => [...(presence.get(String(userId)) || [])],

  emitToSocket(socketId, event, payload) {
    if (io && socketId) io.to(socketId).emit(event, payload);
  },

  emitToUser(userId, event, payload) {
    if (io) io.to(room(String(userId))).emit(event, payload);
  },

  // Force-disconnect every socket of a user (e.g. when an admin disables the account).
  disconnectUser(userId) {
    if (io) io.in(room(String(userId))).disconnectSockets(true);
  },
};
