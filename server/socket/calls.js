// Socket.IO handlers for audio/video call signaling. Validates every payload, rate-limits,
// and forwards only whitelisted fields. SDP and ICE candidates are relayed, never logged.
const registry = require('./registry');
const chat = require('../services/chatService');
const { CallManager, isUuid } = require('../services/callManager');

const MAX_SDP = 32 * 1024;
const INVITES_PER_MINUTE = 5;

const manager = new CallManager({
  socketsOf: registry.socketsOf,
  emit: registry.emitToSocket,
  callContext: chat.callContext,
  logCall: chat.logCall,
  isUserId: (v) => chat.isId(v),
});

// Per-user sliding window (shared by all of a user's tabs).
const inviteHits = new Map();
function allowInvite(userId) {
  const now = Date.now();
  const hits = (inviteHits.get(userId) || []).filter((t) => now - t < 60_000);
  if (hits.length >= INVITES_PER_MINUTE) {
    inviteHits.set(userId, hits);
    return false;
  }
  hits.push(now);
  inviteHits.set(userId, hits);
  return true;
}
// Forget idle users so the map can't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, hits] of inviteHits) if (!hits.some((t) => now - t < 60_000)) inviteHits.delete(k);
}, 5 * 60_000).unref();

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => typeof v === 'string' && v.length <= max;

// Returns a clean copy of the payload for each relayed event, or null if invalid.
const sanitize = {
  'call:offer': (p) => (isObj(p.description) && p.description.type === 'offer' && str(p.description.sdp, MAX_SDP) ? { description: { type: 'offer', sdp: p.description.sdp } } : null),
  'call:answer': (p) => (isObj(p.description) && p.description.type === 'answer' && str(p.description.sdp, MAX_SDP) ? { description: { type: 'answer', sdp: p.description.sdp } } : null),
  'call:ice-candidate': (p) => {
    const c = p.candidate;
    if (c === null) return { candidate: null }; // end of candidates
    if (!isObj(c) || !str(c.candidate, 1024)) return null;
    if (c.sdpMid != null && !str(c.sdpMid, 64)) return null;
    if (c.sdpMLineIndex != null && !(Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 64)) return null;
    if (c.usernameFragment != null && !str(c.usernameFragment, 256)) return null;
    return { candidate: { candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null, usernameFragment: c.usernameFragment ?? null } };
  },
  'call:media-state': (p) => {
    const out = {};
    for (const k of ['audio', 'video', 'videoPaused']) if (typeof p[k] === 'boolean') out[k] = p[k];
    return Object.keys(out).length ? out : null;
  },
};

const ackFn = (ack) => (typeof ack === 'function' ? ack : () => {});

// Attaches call handlers to one authenticated chatuser socket.
function attachCallHandlers(socket, { limiter }) {
  const me = socket.data.userId;
  const ctx = () => ({ userId: me, socketId: socket.id });
  const allowSignal = limiter(400, 10_000); // ICE candidates arrive in bursts
  const allowControl = limiter(30, 10_000);

  socket.on('call:invite', async (payload, ack) => {
    if (!allowInvite(me)) return ackFn(ack)({ ok: false, error: 'Too many calls. Please wait a minute.' });
    try {
      ackFn(ack)(await manager.invite(ctx(), payload));
    } catch {
      ackFn(ack)({ ok: false, error: 'Could not start the call' });
    }
  });

  for (const event of ['ringing', 'accept', 'reject', 'cancel', 'end', 'rejoin']) {
    socket.on(`call:${event}`, (payload, ack) => {
      if (!allowControl() || !isObj(payload) || !isUuid(payload.callId)) return ackFn(ack)({ ok: false });
      try {
        ackFn(ack)(manager[event](ctx(), payload));
      } catch {
        ackFn(ack)({ ok: false });
      }
    });
  }

  for (const event of Object.keys(sanitize)) {
    socket.on(event, (payload) => {
      if (!allowSignal() || !isObj(payload) || !isUuid(payload.callId)) return;
      const data = sanitize[event](payload);
      if (data) manager.relay(ctx(), event, payload.callId, data);
    });
  }

  socket.on('disconnect', () => manager.disconnect(ctx()));
}

module.exports = { attachCallHandlers, manager };
