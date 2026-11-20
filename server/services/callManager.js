// In-memory state machine for one-to-one calls (signaling only; media never touches the server).
// Pure logic: sockets, the database and timers are injected, so it can be unit-tested.
//
// Call states: pending (checking the callee) -> ringing -> active -> (removed)
// A user can be in one call at a time. Assumes a single server instance (Render free tier).

const { randomUUID } = require('crypto');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALL_TYPES = ['audio', 'video'];

const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

class CallManager {
  /**
   * @param {object} deps
   * @param {(userId) => string[]} deps.socketsOf         connected (= unlocked) socket ids of a user
   * @param {(socketId, event, payload) => void} deps.emit
   * @param {(callerId, calleeId) => Promise<{conversationId, caller}|null>} deps.callContext
   * @param {(entry) => Promise<any>} deps.logCall        stores the call log message
   * @param {(id) => boolean} deps.isUserId
   */
  constructor({ socketsOf, emit, callContext, logCall, isUserId, ringTimeoutMs = 45_000, graceMs = 15_000, timers, now }) {
    this.socketsOf = socketsOf;
    this.emit = emit;
    this.callContext = callContext;
    this.logCall = logCall;
    this.isUserId = isUserId;
    this.ringTimeoutMs = ringTimeoutMs;
    this.graceMs = graceMs;
    this.timers = timers || { setTimeout, clearTimeout };
    this.now = now || Date.now;
    this.calls = new Map(); // callId -> call
    this.byUser = new Map(); // userId -> callId
  }

  get(callId) {
    return isUuid(callId) ? this.calls.get(callId) : undefined;
  }

  callOfUser(userId) {
    const id = this.byUser.get(String(userId));
    return id ? this.calls.get(id) : undefined;
  }

  // The socket a participant currently uses for this call (null while reconnecting).
  socketOf(call, userId) {
    return userId === call.callerId ? call.callerSocket : call.calleeSocket;
  }

  peerOf(call, userId) {
    return userId === call.callerId ? call.calleeId : call.callerId;
  }

  // ---------- invite ----------

  async invite({ userId, socketId }, payload) {
    if (!isObj(payload) || !isUuid(payload.callId) || !CALL_TYPES.includes(payload.type) || !this.isUserId(payload.toUserId)) {
      return { ok: false, error: 'Invalid call' };
    }
    const { callId, type } = payload;
    const toUserId = String(payload.toUserId);
    if (toUserId === userId) return { ok: false, error: 'Invalid call' };
    if (this.calls.has(callId)) return { ok: false, error: 'Invalid call' };
    if (this.byUser.has(userId)) return { ok: false, error: 'You are already in a call' };

    // Reserve the caller right away so a second invite can't race this one.
    const call = {
      id: callId,
      type,
      state: 'pending',
      callerId: userId,
      calleeId: toUserId,
      callerSocket: socketId,
      calleeSocket: null,
      ringSockets: new Set(),
      conversationId: null,
      createdAt: this.now(),
      answeredAt: 0,
      ringTimer: null,
      graceTimers: new Map(),
      ringingSent: false,
      ended: false,
      // Per-participant secret, handed out on accept; lets a reconnected tab resume the call.
      resume: { [userId]: randomUUID(), [toUserId]: randomUUID() },
    };
    this.calls.set(callId, call);
    this.byUser.set(userId, callId);

    let ctx = null;
    try {
      ctx = await this.callContext(userId, toUserId);
    } catch {
      ctx = null;
    }
    if (call.ended) return { ok: true }; // caller cancelled or disconnected meanwhile

    const toCaller = (event, extra = {}) => this.emit(call.callerSocket, event, { callId, ...extra });

    // Not allowed (not chatusers / no shared conversation): just "unavailable", nothing logged.
    if (!ctx) {
      this.remove(call);
      toCaller('call:unavailable');
      return { ok: true };
    }
    call.conversationId = ctx.conversationId;

    // Offline or chat locked (no socket): the caller only ever sees "unavailable".
    const sockets = this.socketsOf(toUserId);
    if (!sockets.length) {
      this.finish(call, 'missed');
      toCaller('call:unavailable');
      return { ok: true };
    }
    if (this.byUser.has(toUserId)) {
      this.finish(call, 'missed');
      toCaller('call:busy');
      return { ok: true };
    }

    call.state = 'ringing';
    call.ringSockets = new Set(sockets);
    this.byUser.set(toUserId, callId);
    call.ringTimer = this.timers.setTimeout(() => this.onRingTimeout(callId), this.ringTimeoutMs);
    for (const s of sockets) {
      this.emit(s, 'call:invite', { callId, type, conversationId: ctx.conversationId, from: ctx.caller });
    }
    return { ok: true };
  }

  onRingTimeout(callId) {
    const call = this.calls.get(callId);
    if (!call || call.state !== 'ringing') return;
    this.notifyRinging(call, 'call:end', { reason: 'no-answer' });
    this.emit(call.callerSocket, 'call:end', { callId, reason: 'no-answer' });
    this.finish(call, 'missed');
  }

  notifyRinging(call, event, extra = {}, exceptSocket = null) {
    for (const s of call.ringSockets) if (s !== exceptSocket) this.emit(s, event, { callId: call.id, ...extra });
  }

  // ---------- callee responses ----------

  // The callee's tab is showing the incoming call: tell the caller it is ringing.
  ringing({ userId, socketId }, payload) {
    const call = this.get(payload?.callId);
    if (!call || call.state !== 'ringing' || userId !== call.calleeId || !call.ringSockets.has(socketId)) return { ok: false };
    if (!call.ringingSent) {
      call.ringingSent = true;
      this.emit(call.callerSocket, 'call:ringing', { callId: call.id });
    }
    return { ok: true };
  }

  accept({ userId, socketId }, payload) {
    const call = this.get(payload?.callId);
    if (!call || call.state !== 'ringing' || userId !== call.calleeId || !call.ringSockets.has(socketId)) {
      return { ok: false, error: 'This call is no longer available' };
    }
    this.timers.clearTimeout(call.ringTimer);
    call.state = 'active';
    call.calleeSocket = socketId;
    call.answeredAt = this.now();
    this.notifyRinging(call, 'call:answered-elsewhere', {}, socketId);
    call.ringSockets = new Set([socketId]);
    this.emit(call.callerSocket, 'call:accept', { callId: call.id, resume: call.resume[call.callerId] });
    return { ok: true, resume: call.resume[call.calleeId] };
  }

  reject({ userId, socketId }, payload) {
    const call = this.get(payload?.callId);
    if (!call || call.state !== 'ringing' || userId !== call.calleeId || !call.ringSockets.has(socketId)) return { ok: false };
    this.notifyRinging(call, 'call:end', { reason: 'declined' }, socketId);
    this.emit(call.callerSocket, 'call:reject', { callId: call.id });
    this.finish(call, 'declined');
    return { ok: true };
  }

  // ---------- caller cancel / either side ends ----------

  cancel({ userId, socketId }, payload) {
    const call = this.get(payload?.callId);
    if (!call || userId !== call.callerId || call.callerSocket !== socketId) return { ok: false };
    if (call.state === 'pending') {
      this.remove(call);
      return { ok: true };
    }
    if (call.state !== 'ringing') return { ok: false };
    this.notifyRinging(call, 'call:cancel');
    this.finish(call, 'missed');
    return { ok: true };
  }

  end(ctx, payload) {
    const call = this.get(payload?.callId);
    if (!call || (ctx.userId !== call.callerId && ctx.userId !== call.calleeId)) return { ok: false };
    if (call.state === 'pending' || call.state === 'ringing') {
      return ctx.userId === call.callerId ? this.cancel(ctx, payload) : this.reject(ctx, payload);
    }
    if (this.socketOf(call, ctx.userId) !== ctx.socketId) return { ok: false };
    const peer = this.peerOf(call, ctx.userId);
    this.emit(this.socketOf(call, peer), 'call:end', { callId: call.id, reason: 'ended' });
    this.finish(call, 'completed');
    return { ok: true };
  }

  // ---------- media signaling relay (offer / answer / ice-candidate / media-state) ----------

  relay({ userId, socketId }, event, callId, data) {
    const call = this.get(callId);
    if (!call || call.state !== 'active') return false;
    if (userId !== call.callerId && userId !== call.calleeId) return false;
    if (this.socketOf(call, userId) !== socketId) return false;
    const target = this.socketOf(call, this.peerOf(call, userId));
    if (!target) return false; // peer is reconnecting; WebRTC retries on its own
    this.emit(target, event, { callId, ...data });
    return true;
  }

  // ---------- reconnect ----------

  // A participant's socket dropped and came back (new socket id) during an active call.
  rejoin({ userId, socketId }, payload) {
    const call = this.get(payload?.callId);
    if (!call || call.state !== 'active' || (userId !== call.callerId && userId !== call.calleeId)) return { ok: false };
    // The resume secret proves this is the tab that was in the call (not another open tab).
    if (typeof payload.resume !== 'string' || payload.resume !== call.resume[userId]) return { ok: false };
    const current = this.socketOf(call, userId);
    // The old socket may not have timed out on the server yet: tell it the call moved.
    if (current && current !== socketId) this.emit(current, 'call:answered-elsewhere', { callId: call.id });
    this.timers.clearTimeout(call.graceTimers.get(userId));
    call.graceTimers.delete(userId);
    if (userId === call.callerId) call.callerSocket = socketId;
    else {
      call.calleeSocket = socketId;
      call.ringSockets = new Set([socketId]);
    }
    const peerSocket = this.socketOf(call, this.peerOf(call, userId));
    this.emit(peerSocket, 'call:peer-reconnected', { callId: call.id });
    return { ok: true, type: call.type };
  }

  disconnect({ userId, socketId }) {
    const call = this.callOfUser(userId);
    if (!call) return;

    if (call.state === 'pending') {
      if (userId === call.callerId && call.callerSocket === socketId) this.remove(call);
      return;
    }

    if (call.state === 'ringing') {
      if (userId === call.callerId) {
        if (call.callerSocket !== socketId) return;
        this.notifyRinging(call, 'call:cancel');
        this.finish(call, 'missed');
        return;
      }
      call.ringSockets.delete(socketId);
      if (!call.ringSockets.size) {
        // Callee closed or locked every ringing tab: the caller can't tell why.
        this.emit(call.callerSocket, 'call:unavailable', { callId: call.id });
        this.finish(call, 'missed');
      }
      return;
    }

    // Active: give the participant a short grace period to reconnect.
    if (this.socketOf(call, userId) !== socketId) return;
    if (userId === call.callerId) call.callerSocket = null;
    else call.calleeSocket = null;
    const peerSocket = this.socketOf(call, this.peerOf(call, userId));
    this.emit(peerSocket, 'call:peer-reconnecting', { callId: call.id });
    const timer = this.timers.setTimeout(() => {
      const c = this.calls.get(call.id);
      if (!c || c.ended) return;
      this.emit(this.socketOf(c, this.peerOf(c, userId)), 'call:end', { callId: c.id, reason: 'connection-lost' });
      this.finish(c, 'completed');
    }, this.graceMs);
    call.graceTimers.set(userId, timer);
  }

  // ---------- cleanup ----------

  remove(call) {
    call.ended = true;
    this.timers.clearTimeout(call.ringTimer);
    for (const t of call.graceTimers.values()) this.timers.clearTimeout(t);
    call.graceTimers.clear();
    this.calls.delete(call.id);
    for (const uid of [call.callerId, call.calleeId]) {
      if (this.byUser.get(uid) === call.id) this.byUser.delete(uid);
    }
  }

  // Removes the call and stores the log entry (completed / missed / declined).
  finish(call, outcome) {
    if (call.ended) return;
    this.remove(call);
    if (!call.conversationId) return;
    const duration = outcome === 'completed' && call.answeredAt ? (this.now() - call.answeredAt) / 1000 : 0;
    Promise.resolve()
      .then(() =>
        this.logCall({
          conversationId: call.conversationId,
          callerId: call.callerId,
          calleeId: call.calleeId,
          type: call.type,
          outcome,
          duration,
        })
      )
      .catch(() => {});
  }

  // Counts for tests and health checks (no user data).
  stats() {
    return { calls: this.calls.size, users: this.byUser.size };
  }
}

module.exports = { CallManager, isUuid, CALL_TYPES };
