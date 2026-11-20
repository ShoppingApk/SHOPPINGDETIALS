const { Server } = require('socket.io');
const User = require('../models/User');
const { verifyToken, isTokenStale } = require('../utils/token');
const registry = require('./registry');
const chat = require('../services/chatService');

const MAX_PAYLOAD_BYTES = 16 * 1024;

// Sliding-window limiter per socket: `limit` events per `windowMs`.
function limiter(limit, windowMs) {
  const hits = [];
  return () => {
    const now = Date.now();
    while (hits.length && now - hits[0] > windowMs) hits.shift();
    if (hits.length >= limit) return false;
    hits.push(now);
    return true;
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const ackFn = (ack) => (typeof ack === 'function' ? ack : () => {});
const fail = (ack, err) => ackFn(ack)({ ok: false, error: err?.status && err.status < 500 ? err.message : 'Something went wrong' });

module.exports = function initSocket(httpServer, corsOptions) {
  const io = new Server(httpServer, {
    cors: corsOptions, // same CLIENT_URL allow-list as the REST API
    transports: ['websocket', 'polling'], // polling fallback for proxies / Render free tier
    maxHttpBufferSize: MAX_PAYLOAD_BYTES,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
  registry.setIO(io);

  // Presence is in memory, so nobody is online right after a restart.
  User.updateMany({ isOnline: true }, { $set: { isOnline: false } }).catch(() => {});

  // Auth: JWT from the handshake `auth` payload only (never the query string, which ends up in logs).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(new Error('unauthorized'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select('name role isActive passwordChangedAt');
      if (!user || !user.isActive || user.role !== 'chatuser' || isTokenStale(user, payload)) return next(new Error('unauthorized'));
      socket.data.userId = String(user._id);
      socket.data.peers = new Map(); // conversationId -> other participant id (cache)
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const me = socket.data.userId;
    const allowMessage = limiter(20, 10_000);
    const allowOther = limiter(60, 10_000);

    socket.join(registry.room(me));

    if (registry.addSocket(me, socket.id)) {
      User.updateOne({ _id: me }, { $set: { isOnline: true } }).catch(() => {});
      socket.broadcast.emit('presence:online', { userId: me });
    }

    // Anything sent to me while I was offline is now delivered.
    try {
      for (const g of await chat.markAllPendingDelivered(me)) {
        registry.emitToUser(g.senderId, 'message:delivered', { conversationId: g.conversationId, messageIds: g.messageIds, at: g.at });
      }
    } catch {
      /* non-fatal */
    }

    // Other participant of a conversation I belong to (cached per socket).
    async function peerOf(conversationId) {
      if (!chat.isId(conversationId)) throw Object.assign(new Error('Not found'), { status: 404 });
      if (socket.data.peers.has(conversationId)) return socket.data.peers.get(conversationId);
      const conv = await chat.conversationFor(me, conversationId);
      const peer = String(chat.otherParticipant(conv, me));
      socket.data.peers.set(conversationId, peer);
      return peer;
    }

    // message:send { conversationId, text?, imageUrl?, tempId? } -> ack { ok, message }
    socket.on('message:send', async (payload, ack) => {
      try {
        if (!allowMessage()) return fail(ack, { status: 429, message: 'You are sending messages too fast. Please wait a moment.' });
        if (!isObj(payload) || !chat.isId(payload.conversationId)) return fail(ack, { status: 422, message: 'Invalid message' });
        if (payload.text !== undefined && typeof payload.text !== 'string') return fail(ack, { status: 422, message: 'Invalid message' });
        if (payload.imageUrl !== undefined && typeof payload.imageUrl !== 'string') return fail(ack, { status: 422, message: 'Invalid image' });
        if ((payload.text || '').length > chat.MAX_TEXT) return fail(ack, { status: 422, message: `Messages can be at most ${chat.MAX_TEXT} characters` });
        const tempId = typeof payload.tempId === 'string' ? payload.tempId.slice(0, 40) : undefined;

        const message = await chat.sendMessage(me, payload);
        const peer = String(message.receiver);
        socket.data.peers.set(String(message.conversation), peer);

        registry.emitToUser(peer, 'message:new', { message });
        socket.to(registry.room(me)).emit('message:new', { message, tempId }); // my other tabs
        ackFn(ack)({ ok: true, message, tempId });
      } catch (err) {
        fail(ack, err);
      }
    });

    // typing:start / typing:stop { conversationId }
    for (const event of ['typing:start', 'typing:stop']) {
      socket.on(event, async (payload) => {
        try {
          if (!allowOther() || !isObj(payload)) return;
          const peer = await peerOf(payload.conversationId);
          registry.emitToUser(peer, event, { conversationId: payload.conversationId, userId: me });
        } catch {
          /* ignore invalid typing events */
        }
      });
    }

    // message:delivered { messageIds: [] } — recipient confirms receipt.
    socket.on('message:delivered', async (payload, ack) => {
      try {
        if (!allowOther()) return fail(ack, { status: 429, message: 'Slow down' });
        const ids = isObj(payload) && Array.isArray(payload.messageIds) ? payload.messageIds.filter(chat.isId).slice(0, 100) : [];
        if (!ids.length) return ackFn(ack)({ ok: true });
        for (const g of await chat.markDeliveredByIds(me, ids)) {
          registry.emitToUser(g.senderId, 'message:delivered', { conversationId: g.conversationId, messageIds: g.messageIds, at: g.at });
        }
        ackFn(ack)({ ok: true });
      } catch (err) {
        fail(ack, err);
      }
    });

    // message:read { conversationId } — everything addressed to me in it is now read.
    socket.on('message:read', async (payload, ack) => {
      try {
        if (!allowOther()) return fail(ack, { status: 429, message: 'Slow down' });
        if (!isObj(payload) || !chat.isId(payload.conversationId)) return fail(ack, { status: 422, message: 'Invalid conversation' });
        const r = await chat.markRead(me, payload.conversationId);
        if (r.messageIds.length) {
          const event = { conversationId: r.conversationId, messageIds: r.messageIds, at: r.at, readerId: me };
          registry.emitToUser(r.senderId, 'message:read', event);
          socket.to(registry.room(me)).emit('message:read', event); // clear unread badge in my other tabs
        }
        ackFn(ack)({ ok: true, count: r.messageIds.length });
      } catch (err) {
        fail(ack, err);
      }
    });

    // message:delete { messageId, scope: "me" | "everyone" }
    socket.on('message:delete', async (payload, ack) => {
      try {
        if (!allowOther()) return fail(ack, { status: 429, message: 'Slow down' });
        if (!isObj(payload) || !chat.isId(payload.messageId)) return fail(ack, { status: 422, message: 'Invalid message' });
        const result = await chat.deleteMessage(me, payload.messageId, payload.scope);
        chat.broadcastDelete(result);
        ackFn(ack)({ ok: true, messageId: result.messageId, scope: result.scope, message: result.message });
      } catch (err) {
        fail(ack, err);
      }
    });

    socket.on('disconnect', () => {
      if (registry.removeSocket(me, socket.id)) {
        const lastSeen = new Date();
        User.updateOne({ _id: me }, { $set: { isOnline: false, lastSeen } }).catch(() => {});
        io.emit('presence:offline', { userId: me, lastSeen });
      }
    });
  });

  return io;
};
