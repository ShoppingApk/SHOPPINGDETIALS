// Unit tests for the call signaling state machine. Run: npm test (in server/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { CallManager } = require('../services/callManager');

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);
const C = 'c'.repeat(24);

// Manual clock + timers so timeouts can be tested instantly.
function fakeTimers() {
  let now = 1_000_000;
  let seq = 0;
  const pending = new Map();
  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      pending.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimeout: (id) => pending.delete(id),
    advance(ms) {
      now += ms;
      for (const [id, t] of [...pending].sort((x, y) => x[1].at - y[1].at)) {
        if (t.at <= now && pending.has(id)) {
          pending.delete(id);
          t.fn();
        }
      }
    },
    count: () => pending.size,
  };
}

function setup({ online = { [A]: ['sA'], [B]: ['sB1', 'sB2'], [C]: ['sC'] }, allowed = true } = {}) {
  const timers = fakeTimers();
  const sent = []; // [socketId, event, payload]
  const logs = [];
  const sockets = { ...online };
  const m = new CallManager({
    socketsOf: (u) => sockets[u] || [],
    emit: (s, event, payload) => s && sent.push([s, event, payload]),
    callContext: async () => (allowed ? { conversationId: 'conv1', caller: { _id: A, name: 'Asha' } } : null),
    logCall: async (e) => logs.push(e),
    isUserId: (v) => typeof v === 'string' && /^[a-f0-9]{24}$/.test(v),
    ringTimeoutMs: 45_000,
    graceMs: 15_000,
    timers,
    now: timers.now,
  });
  const events = (socket) => sent.filter(([s]) => s === socket).map(([, e]) => e);
  const flush = () => new Promise((r) => setImmediate(r));
  return { m, timers, sent, logs, sockets, events, flush };
}

const caller = { userId: A, socketId: 'sA' };
const calleeTab1 = { userId: B, socketId: 'sB1' };
const calleeTab2 = { userId: B, socketId: 'sB2' };

async function ring(t, type = 'audio') {
  const callId = randomUUID();
  const res = await t.m.invite(caller, { callId, toUserId: B, type });
  assert.deepEqual(res, { ok: true });
  return callId;
}

test('invite rings every unlocked tab of the callee', async () => {
  const t = setup();
  const callId = await ring(t, 'video');
  assert.deepEqual(t.events('sB1'), ['call:invite']);
  assert.deepEqual(t.events('sB2'), ['call:invite']);
  const [, , payload] = t.sent.find(([s]) => s === 'sB1');
  assert.equal(payload.callId, callId);
  assert.equal(payload.type, 'video');
  assert.equal(payload.from.name, 'Asha');
  assert.equal(t.m.callOfUser(A).state, 'ringing');
  assert.equal(t.m.callOfUser(B).id, callId);
});

test('invalid payloads are rejected without state changes', async () => {
  const t = setup();
  for (const bad of [null, {}, { callId: 'x', toUserId: B, type: 'audio' }, { callId: randomUUID(), toUserId: B, type: 'screen' }, { callId: randomUUID(), toUserId: 'nope', type: 'audio' }, { callId: randomUUID(), toUserId: A, type: 'audio' }]) {
    assert.equal((await t.m.invite(caller, bad)).ok, false);
  }
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('offline or locked callee: caller only sees "unavailable", missed call logged', async () => {
  const t = setup({ online: { [A]: ['sA'] } });
  await ring(t);
  assert.deepEqual(t.events('sA'), ['call:unavailable']);
  await t.flush();
  assert.equal(t.logs[0].outcome, 'missed');
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('not allowed (no shared conversation / not chatusers): unavailable, nothing logged', async () => {
  const t = setup({ allowed: false });
  await ring(t);
  assert.deepEqual(t.events('sA'), ['call:unavailable']);
  assert.deepEqual(t.events('sB1'), []);
  await t.flush();
  assert.equal(t.logs.length, 0);
});

test('busy: a user can only be in one call', async () => {
  const t = setup();
  await ring(t); // A -> B ringing
  const res = await t.m.invite({ userId: C, socketId: 'sC' }, { callId: randomUUID(), toUserId: B, type: 'audio' });
  assert.equal(res.ok, true);
  assert.deepEqual(t.events('sC'), ['call:busy']);
  // And the caller can't start a second call.
  const again = await t.m.invite(caller, { callId: randomUUID(), toUserId: C, type: 'audio' });
  assert.equal(again.ok, false);
});

test('ringing is forwarded once; accept connects and tells the other tab', async () => {
  const t = setup();
  const callId = await ring(t);
  t.m.ringing(calleeTab1, { callId });
  t.m.ringing(calleeTab2, { callId });
  assert.deepEqual(t.events('sA'), ['call:ringing']);

  const res = t.m.accept(calleeTab2, { callId });
  assert.equal(res.ok, true);
  assert.equal(typeof res.resume, 'string');
  assert.ok(t.events('sA').includes('call:accept'));
  assert.ok(t.events('sB1').includes('call:answered-elsewhere'));
  assert.equal(t.m.get(callId).state, 'active');
  // A second accept (from the other tab) fails.
  assert.equal(t.m.accept(calleeTab1, { callId }).ok, false);
});

test('only the two participants (on the right tab) can relay signaling', async () => {
  const t = setup();
  const callId = await ring(t);
  t.m.accept(calleeTab1, { callId });
  assert.equal(t.m.relay(caller, 'call:offer', callId, { description: { type: 'offer', sdp: 'x' } }), true);
  assert.ok(t.events('sB1').includes('call:offer'));
  assert.equal(t.m.relay({ userId: C, socketId: 'sC' }, 'call:offer', callId, {}), false); // outsider
  assert.equal(t.m.relay(calleeTab2, 'call:answer', callId, {}), false); // callee's other tab
  assert.equal(t.m.relay(caller, 'call:offer', randomUUID(), {}), false); // unknown call
});

test('ring timeout: "no answer" for both after 45 s, logged as missed', async () => {
  const t = setup();
  await ring(t);
  t.timers.advance(44_999);
  assert.equal(t.m.stats().calls, 1);
  t.timers.advance(1);
  assert.ok(t.events('sA').includes('call:end'));
  assert.ok(t.events('sB1').includes('call:end'));
  assert.equal(t.sent.find(([s, e]) => s === 'sA' && e === 'call:end')[2].reason, 'no-answer');
  await t.flush();
  assert.equal(t.logs[0].outcome, 'missed');
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('decline and cancel', async () => {
  const t = setup();
  let callId = await ring(t);
  t.m.reject(calleeTab1, { callId });
  assert.ok(t.events('sA').includes('call:reject'));
  assert.ok(t.events('sB2').includes('call:end'));
  await t.flush();
  assert.equal(t.logs.at(-1).outcome, 'declined');

  callId = await ring(t);
  t.m.cancel(caller, { callId });
  assert.ok(t.events('sB1').includes('call:cancel'));
  await t.flush();
  assert.equal(t.logs.at(-1).outcome, 'missed');
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('end of an active call logs the duration and frees both users', async () => {
  const t = setup();
  const callId = await ring(t);
  t.m.accept(calleeTab1, { callId });
  t.timers.advance(65_000);
  assert.equal(t.m.end(calleeTab2, { callId }).ok, false); // not the tab in the call
  assert.equal(t.m.end(calleeTab1, { callId }).ok, true);
  assert.ok(t.events('sA').includes('call:end'));
  await t.flush();
  assert.equal(t.logs[0].outcome, 'completed');
  assert.equal(Math.round(t.logs[0].duration), 65);
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
  assert.equal(t.timers.count(), 0);
});

test('callee closes / locks every ringing tab: caller sees unavailable', async () => {
  const t = setup();
  await ring(t);
  t.m.disconnect(calleeTab1);
  assert.equal(t.m.stats().calls, 1); // one tab still ringing
  t.m.disconnect(calleeTab2);
  assert.ok(t.events('sA').includes('call:unavailable'));
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('caller disconnects while ringing: callee sees cancel', async () => {
  const t = setup();
  await ring(t);
  t.m.disconnect(caller);
  assert.ok(t.events('sB1').includes('call:cancel'));
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('disconnect during a call: 15 s grace, rejoin with the resume token keeps the call', async () => {
  const t = setup();
  const callId = await ring(t);
  const { resume } = t.m.accept(calleeTab1, { callId });
  t.m.disconnect(calleeTab1);
  assert.ok(t.events('sA').includes('call:peer-reconnecting'));
  t.timers.advance(10_000);

  const newTab = { userId: B, socketId: 'sB9' };
  assert.equal(t.m.rejoin(newTab, { callId, resume: 'wrong' }).ok, false);
  assert.equal(t.m.rejoin(newTab, { callId, resume }).ok, true);
  assert.ok(t.events('sA').includes('call:peer-reconnected'));
  t.timers.advance(20_000);
  assert.equal(t.m.get(callId).state, 'active'); // grace timer was cancelled
  assert.equal(t.m.relay(newTab, 'call:answer', callId, {}), true);
});

test('disconnect during a call without rejoin ends it after the grace period', async () => {
  const t = setup();
  const callId = await ring(t);
  t.m.accept(calleeTab1, { callId });
  t.m.disconnect(caller);
  t.timers.advance(14_999);
  assert.equal(t.m.stats().calls, 1);
  t.timers.advance(1);
  const end = t.sent.find(([s, e]) => s === 'sB1' && e === 'call:end');
  assert.equal(end[2].reason, 'connection-lost');
  await t.flush();
  assert.equal(t.logs[0].outcome, 'completed');
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});

test('caller cancels while the callee check is still running', async () => {
  const t = setup();
  let release;
  t.m.callContext = () => new Promise((r) => (release = r));
  const callId = randomUUID();
  const p = t.m.invite(caller, { callId, toUserId: B, type: 'audio' });
  t.m.cancel(caller, { callId });
  release({ conversationId: 'conv1', caller: { _id: A, name: 'Asha' } });
  await p;
  assert.deepEqual(t.events('sB1'), []); // never rang
  assert.deepEqual(t.m.stats(), { calls: 0, users: 0 });
});
