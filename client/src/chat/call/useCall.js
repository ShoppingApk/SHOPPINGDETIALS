// Call orchestration for the chat screen: invite / ring / accept / connect / end.
// Lives inside the lazily loaded chat module, so shoppers never download it.
// Ends the call and turns the camera and microphone off whenever the chat screen goes away
// (lock, panic, logout, auto-lock), because the socket closes and this hook unmounts.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { chatApi } from '../../api/chatData';
import { useChat } from '../../context/ChatContext';
import CallSession from './callService';
import { getCallMedia, getCamera, getMicrophone, listDevices, mediaSupported, stopStream } from './media';
import { playTone } from './tones';

export const CallContext = createContext(null);
export const useCallCtx = () => useContext(CallContext);

const OUTGOING_TIMEOUT_MS = 50_000; // the server gives up at 45 s; this is a safety net
const ENDED_SCREEN_MS = 1800;

const END_LABELS = {
  declined: 'Call declined',
  busy: 'Busy on another call',
  unavailable: 'Unavailable',
  'no-answer': 'No answer',
  ended: 'Call ended',
  cancelled: 'Call ended',
  missed: 'Missed call',
  'connection-lost': 'Call ended: connection lost',
  'answered-elsewhere': 'Answered on another device',
  error: 'Call ended',
};

const newCallId = () =>
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

// Generic, content-free notification (never mentions calls or chat).
function notifyGeneric() {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification('Kaasni', { body: 'You have a new update', tag: 'kz-update', icon: '/favicon.svg' });
    }
  } catch {
    /* unsupported */
  }
}

// True while the call with this id is still in one of the given phases (it may have been
// ended or replaced by a socket event while we were awaiting something).
const still = (c, id, phases) => !!c && c.id === id && phases.includes(c.phase);

export default function useCall(socketApi) {
  const chat = useChat();
  const chatRef = useRef(chat);
  chatRef.current = chat;

  // UI state. `call` is null when idle.
  const [call, setCall] = useState(null);
  const [streams, setStreams] = useState({ local: null, remote: null, v: 0 });

  // Mutable call internals (not rendered).
  const r = useRef({ call: null, session: null, local: null, tone: null, timers: {}, pendingSignals: [], ice: null, wakeLock: null, resume: null, facing: 'user' });

  // Updates the ref synchronously (socket handlers read it) and re-renders.
  const patch = useCallback((p) => {
    const c = r.current.call;
    if (!c) return;
    const next = { ...c, ...(typeof p === 'function' ? p(c) : p) };
    r.current.call = next;
    setCall(next);
  }, []);

  const bumpStreams = useCallback(() => {
    setStreams({ local: r.current.local, remote: r.current.session?.remoteStream || null, v: Date.now() });
  }, []);

  // ---------- ICE servers (cached for their lifetime) ----------
  const fetchIce = useCallback(async (force = false) => {
    const cached = r.current.ice;
    if (!force && cached && cached.expiresAt > Date.now()) return cached.value;
    try {
      const value = await chatApi.iceServers();
      const ttlMs = value.ttl ? Math.min(value.ttl * 500, 10 * 60_000) : 10 * 60_000;
      r.current.ice = { value, expiresAt: Date.now() + ttlMs };
      return value;
    } catch {
      return { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }], turn: false, provider: 'none' };
    }
  }, []);

  // ---------- tones / wake lock ----------
  const stopTone = useCallback(() => {
    r.current.tone?.stop();
    r.current.tone = null;
  }, []);
  const startTone = useCallback(
    (kind) => {
      stopTone();
      r.current.tone = playTone(kind);
    },
    [stopTone]
  );

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible' && !r.current.wakeLock) {
        const lock = await navigator.wakeLock.request('screen');
        r.current.wakeLock = lock;
        lock.addEventListener?.('release', () => {
          if (r.current.wakeLock === lock) r.current.wakeLock = null;
        });
      }
    } catch {
      /* not supported or not allowed */
    }
  }, []);
  const releaseWakeLock = useCallback(() => {
    r.current.wakeLock?.release().catch(() => {});
    r.current.wakeLock = null;
  }, []);

  // ---------- teardown ----------
  // Stops everything local. Safe to call many times.
  const cleanup = useCallback(() => {
    const st = r.current;
    stopTone();
    Object.values(st.timers).forEach(clearTimeout);
    st.timers = {};
    st.session?.close();
    st.session = null;
    stopStream(st.local);
    st.local = null;
    st.pendingSignals = [];
    st.resume = null;
    releaseWakeLock();
    chatRef.current.setInCall(false);
  }, [stopTone, releaseWakeLock]);

  // Ends the call locally (after telling the server when `notify` is set) and shows a short summary.
  const finish = useCallback(
    (reason = 'ended', { notify = false, quiet = false } = {}) => {
      const c = r.current.call;
      if (!c || c.phase === 'ended') return;
      if (notify) socketApi.emit('call:end', { callId: c.id });
      cleanup();
      bumpStreams();
      if (quiet) {
        r.current.call = null;
        setCall(null);
        return;
      }
      const ended = { ...c, phase: 'ended', endLabel: END_LABELS[reason] || END_LABELS.ended };
      r.current.call = ended;
      setCall(ended);
      r.current.timers.endedScreen = setTimeout(() => {
        if (r.current.call?.phase === 'ended') {
          r.current.call = null;
          setCall(null);
        }
      }, ENDED_SCREEN_MS);
    },
    [socketApi, cleanup, bumpStreams]
  );

  // ---------- peer connection ----------
  const createSession = useCallback(
    async (polite) => {
      const c = r.current.call;
      const ice = await fetchIce();
      if (!still(r.current.call, c.id, ['connecting'])) return;
      const callId = c.id;
      const session = new CallSession({
        polite,
        type: c.type,
        iceServers: ice.iceServers,
        localStream: r.current.local,
        signal: (event, data) => socketApi.emit(event, { callId, ...data }),
        refreshIce: async () => (await fetchIce(true)).iceServers,
        onChange: (p) => {
          if (r.current.session !== session) return;
          if (p.remoteStream || p.remoteTracks) bumpStreams();
          const ui = {};
          if (p.quality) ui.quality = p.quality;
          if (p.stats) ui.stats = p.stats;
          if ('videoPausedForNetwork' in p) ui.localVideoPaused = p.videoPausedForNetwork;
          if (p.connection) {
            if (p.connection === 'connected') {
              ui.phase = 'active';
              ui.failed = false;
              if (!r.current.call?.connectedAt) ui.connectedAt = Date.now();
            } else if (p.connection === 'reconnecting') ui.phase = 'reconnecting';
            else if (p.connection === 'failed') ui.failed = true;
            else if (p.connection === 'lost') {
              finish('connection-lost', { notify: true });
              return;
            }
          }
          if (Object.keys(ui).length) patch(ui);
        },
      });
      r.current.session = session;
      bumpStreams();
      // Signals that arrived before the session existed.
      const early = r.current.pendingSignals.splice(0);
      early.forEach(([event, data]) => (event === 'call:ice-candidate' ? session.handleCandidate(data.candidate) : session.handleDescription(data.description)));
      requestWakeLock();
    },
    [fetchIce, socketApi, bumpStreams, patch, finish, requestWakeLock]
  );

  // ---------- outgoing ----------
  const startCall = useCallback(
    async (conversation, type) => {
      if (r.current.call) return toast.error('You are already in a call');
      if (!mediaSupported()) return toast.error('Calls need a secure (https) page and an up-to-date browser.');
      if (!socketApi.connected()) return toast.error('Not connected. Check your internet connection.');

      const callId = newCallId();
      const initial = {
        id: callId,
        type,
        direction: 'outgoing',
        phase: 'starting',
        peer: conversation.other,
        conversationId: conversation._id,
        micOn: true,
        camOn: type === 'video',
        remote: { audio: true, video: type === 'video', videoPaused: false },
        quality: 'good',
      };
      r.current.call = initial;
      setCall(initial);
      chatRef.current.setInCall(true);
      fetchIce(); // warm up in parallel

      let media;
      try {
        media = await getCallMedia(type);
      } catch (err) {
        finish('error', { quiet: true });
        return toast.error(err.message);
      }
      if (!still(r.current.call, callId, ['starting'])) return stopStream(media.stream); // cancelled meanwhile
      r.current.local = media.stream;
      if (media.cameraError) {
        toast(`${media.cameraError.message} Continuing with audio only.`, { icon: '🎙️' });
        patch({ camOn: false });
      }
      bumpStreams();

      const res = await socketApi.emitWithAck('call:invite', { callId, toUserId: conversation.other._id, type });
      // The answer (busy / unavailable) can arrive before this ack: then the call already ended.
      if (!still(r.current.call, callId, ['starting'])) return undefined;
      if (!res?.ok) {
        finish('error', { quiet: true });
        return toast.error(res?.error || 'Could not start the call');
      }
      patch({ phase: 'calling' });
      startTone('outgoing');
      requestWakeLock();
      r.current.timers.outgoing = setTimeout(() => {
        if (['calling', 'ringing'].includes(r.current.call?.phase)) finish('no-answer', { notify: true });
      }, OUTGOING_TIMEOUT_MS);
      return undefined;
    },
    [socketApi, fetchIce, finish, patch, bumpStreams, startTone, requestWakeLock]
  );

  // ---------- incoming ----------
  const accept = useCallback(async () => {
    const c = r.current.call;
    if (!c || c.phase !== 'incoming') return;
    stopTone();
    patch({ phase: 'connecting' });
    fetchIce();

    let media;
    try {
      media = await getCallMedia(c.type);
    } catch (err) {
      toast.error(err.message);
      socketApi.emit('call:reject', { callId: c.id });
      finish('error', { quiet: true });
      return;
    }
    if (!still(r.current.call, c.id, ['connecting'])) {
      stopStream(media.stream);
      return;
    }
    r.current.local = media.stream;
    if (media.cameraError) {
      toast(`${media.cameraError.message} Continuing with audio only.`, { icon: '🎙️' });
      patch({ camOn: false });
    }
    bumpStreams();

    const res = await socketApi.emitWithAck('call:accept', { callId: c.id });
    if (!still(r.current.call, c.id, ['connecting'])) return;
    if (!res?.ok) {
      finish('error', { quiet: true });
      toast.error(res?.error || 'This call is no longer available');
      return;
    }
    r.current.resume = res.resume;
    await createSession(true);
  }, [patch, stopTone, fetchIce, socketApi, finish, bumpStreams, createSession]);

  const decline = useCallback(() => {
    const c = r.current.call;
    if (!c || c.phase !== 'incoming') return;
    socketApi.emit('call:reject', { callId: c.id });
    finish('declined', { quiet: true });
  }, [socketApi, finish]);

  const hangup = useCallback(() => {
    const c = r.current.call;
    if (!c || c.phase === 'ended') return;
    if (c.phase === 'incoming') return decline();
    return finish('ended', { notify: true });
  }, [decline, finish]);

  // ---------- in-call controls ----------
  const sendMediaState = useCallback(() => {
    const c = r.current.call;
    if (c) socketApi.emit('call:media-state', { callId: c.id, audio: !!c.micOn, video: !!c.camOn });
  }, [socketApi]);

  const toggleMic = useCallback(() => {
    const c = r.current.call;
    const track = r.current.local?.getAudioTracks()[0];
    if (!c || !track) return;
    track.enabled = !c.micOn;
    patch({ micOn: !c.micOn });
    sendMediaState();
  }, [patch, sendMediaState]);

  // Camera off really stops the camera (the light goes off); on re-opens it.
  const toggleCamera = useCallback(async () => {
    const c = r.current.call;
    const st = r.current;
    if (!c || c.type !== 'video' || !st.local) return;
    if (c.camOn) {
      st.local.getVideoTracks().forEach((t) => {
        t.stop();
        st.local.removeTrack(t);
      });
      await st.session?.replaceVideoTrack(null);
      patch({ camOn: false });
    } else {
      try {
        const track = await getCamera(st.facing);
        if (r.current.call?.id !== c.id) return track.stop();
        st.local.addTrack(track);
        await st.session?.replaceVideoTrack(track);
        patch({ camOn: true });
      } catch (err) {
        return toast.error(err.message);
      }
    }
    bumpStreams();
    sendMediaState();
    return undefined;
  }, [patch, bumpStreams, sendMediaState]);

  const switchCamera = useCallback(async () => {
    const c = r.current.call;
    const st = r.current;
    if (!c?.camOn || !st.local) return;
    const cams = await listDevices('videoinput');
    if (cams.length < 2) return toast('No other camera found');
    const old = st.local.getVideoTracks()[0];
    const nextFacing = st.facing === 'user' ? 'environment' : 'user';
    // Phones often can't open two cameras at once: stop the current one first.
    old?.stop();
    let track;
    try {
      track = await getCamera(nextFacing);
      if (old && track.getSettings().deviceId === old.getSettings().deviceId) {
        // facingMode was ignored (desktop): pick the next device instead.
        track.stop();
        const idx = cams.findIndex((d) => d.deviceId === old.getSettings().deviceId);
        track = await getCamera(undefined, cams[(idx + 1) % cams.length].deviceId);
      }
    } catch (err) {
      toast.error(err.message);
      try {
        track = await getCamera(st.facing);
      } catch {
        track = null;
      }
    }
    if (old) st.local.removeTrack(old);
    if (track) {
      st.local.addTrack(track);
      st.facing = track.getSettings().facingMode || nextFacing;
    }
    await st.session?.replaceVideoTrack(track);
    patch({ camOn: !!track, facing: st.facing });
    bumpStreams();
    return undefined;
  }, [patch, bumpStreams]);

  const retryConnect = useCallback(() => {
    patch({ failed: false, phase: 'connecting' });
    r.current.session?.retry();
  }, [patch]);

  // From the "Could not connect" screen: drop video to make the call lighter, then retry.
  const switchToAudioOnly = useCallback(async () => {
    const st = r.current;
    if (st.call?.camOn) {
      st.local?.getVideoTracks().forEach((t) => {
        t.stop();
        st.local.removeTrack(t);
      });
      await st.session?.replaceVideoTrack(null);
      patch({ camOn: false });
      sendMediaState();
      bumpStreams();
    }
    retryConnect();
  }, [patch, sendMediaState, bumpStreams, retryConnect]);

  // ---------- socket events ----------
  useEffect(() => {
    const cur = () => r.current.call;
    const isCurrent = (p) => p && cur() && p.callId === cur().id;
    const offs = [];
    const on = (event, fn) => offs.push(socketApi.on(event, fn));

    on('call:invite', (p) => {
      if (!p?.callId || !p.from) return;
      if (cur()) {
        // Already busy here (e.g. dialling out at the same moment).
        socketApi.emit('call:reject', { callId: p.callId });
        return;
      }
      const incoming = {
        id: p.callId,
        type: p.type === 'video' ? 'video' : 'audio',
        direction: 'incoming',
        phase: 'incoming',
        peer: p.from,
        conversationId: p.conversationId,
        micOn: true,
        camOn: p.type === 'video',
        remote: { audio: true, video: p.type === 'video', videoPaused: false },
        quality: 'good',
      };
      r.current.call = incoming;
      setCall(incoming);
      chatRef.current.setInCall(true);
      socketApi.emit('call:ringing', { callId: p.callId });
      startTone('incoming');
      fetchIce();
      if (document.visibilityState === 'hidden' && chatRef.current.settings.notify) notifyGeneric();
    });

    on('call:ringing', (p) => isCurrent(p) && cur().phase === 'calling' && patch({ phase: 'ringing' }));
    on('call:accept', (p) => {
      if (!isCurrent(p) || !['calling', 'ringing'].includes(cur().phase)) return;
      clearTimeout(r.current.timers.outgoing);
      stopTone();
      r.current.resume = p.resume;
      patch({ phase: 'connecting' });
      createSession(false);
    });
    on('call:reject', (p) => isCurrent(p) && finish('declined'));
    on('call:busy', (p) => isCurrent(p) && finish('busy'));
    on('call:unavailable', (p) => isCurrent(p) && finish('unavailable'));
    on('call:cancel', (p) => isCurrent(p) && finish('missed', { quiet: cur().phase === 'incoming' }));
    on('call:answered-elsewhere', (p) => isCurrent(p) && finish('answered-elsewhere', { quiet: true }));
    on('call:end', (p) => {
      if (!isCurrent(p)) return;
      const quiet = cur().phase === 'incoming';
      finish(p.reason === 'no-answer' ? (cur().direction === 'incoming' ? 'missed' : 'no-answer') : p.reason, { quiet });
    });

    const signal = (event) => (p) => {
      if (!isCurrent(p)) return;
      const session = r.current.session;
      if (!session) {
        r.current.pendingSignals.push([event, p]);
        return;
      }
      if (event === 'call:ice-candidate') session.handleCandidate(p.candidate);
      else if (p.description) session.handleDescription(p.description);
    };
    on('call:offer', signal('call:offer'));
    on('call:answer', signal('call:answer'));
    on('call:ice-candidate', signal('call:ice-candidate'));
    on('call:media-state', (p) => {
      if (!isCurrent(p)) return;
      const remote = { ...cur().remote };
      for (const k of ['audio', 'video', 'videoPaused']) if (typeof p[k] === 'boolean') remote[k] = p[k];
      patch({ remote });
    });
    on('call:peer-reconnecting', (p) => isCurrent(p) && patch({ peerSignalLost: true }));
    on('call:peer-reconnected', (p) => isCurrent(p) && patch({ peerSignalLost: false }));

    // Socket came back after a drop: re-attach to the call (media may still be flowing).
    offs.push(
      socketApi.onConnect(async (reconnected) => {
        const c = cur();
        if (!reconnected || !c || c.phase === 'ended') return;
        if (!r.current.resume) {
          // Still ringing when the socket dropped: the server has already ended it.
          finish(c.direction === 'incoming' ? 'missed' : 'ended', { quiet: c.phase === 'incoming' });
          return;
        }
        const res = await socketApi.emitWithAck('call:rejoin', { callId: c.id, resume: r.current.resume });
        if (cur()?.id !== c.id) return;
        if (!res?.ok) finish('connection-lost');
        else sendMediaState();
      })
    );

    // Lock / panic / logout: the chat screen closes. End the call before the socket goes.
    offs.push(
      socketApi.beforeClose((sock) => {
        const c = cur();
        // While still ringing here, just disappear: the caller then sees only "Unavailable".
        if (c && c.phase !== 'ended' && c.phase !== 'incoming') {
          try {
            sock.emit('call:end', { callId: c.id });
          } catch {
            /* closing anyway */
          }
        }
        cleanup();
        r.current.call = null;
      })
    );

    return () => offs.forEach((off) => off());
  }, [socketApi, patch, finish, createSession, startTone, stopTone, fetchIce, cleanup, sendMediaState]);

  // ---------- page lifecycle ----------
  useEffect(() => {
    const onVisible = async () => {
      const c = r.current.call;
      if (document.visibilityState !== 'visible' || !c || c.phase === 'ended' || c.phase === 'incoming') return;
      requestWakeLock();
      // Phones may stop the camera while the tab is in the background: restart it.
      const st = r.current;
      const vt = st.local?.getVideoTracks()[0];
      if (c.camOn && st.local && (!vt || vt.readyState === 'ended')) {
        try {
          const track = await getCamera(st.facing);
          if (vt) st.local.removeTrack(vt);
          st.local.addTrack(track);
          await st.session?.replaceVideoTrack(track);
          bumpStreams();
        } catch {
          patch({ camOn: false });
          sendMediaState();
        }
      }
      // Same for the microphone (e.g. headset unplugged).
      const at = st.local?.getAudioTracks()[0];
      if (st.local && at && at.readyState === 'ended') {
        try {
          const track = (await getMicrophone()).getAudioTracks()[0];
          track.enabled = !!c.micOn;
          st.local.removeTrack(at);
          st.local.addTrack(track);
          await st.session?.replaceAudioTrack(track);
        } catch {
          /* keep going */
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    // Tab closed or reloaded mid-call: tell the other side now instead of after the 15 s grace.
    // (Still ringing here: say nothing, so the caller just sees "Unavailable".)
    const onPageHide = (e) => {
      const c = r.current.call;
      if (e.persisted || !c || ['ended', 'incoming'].includes(c.phase)) return;
      socketApi.emit('call:end', { callId: c.id });
      cleanup();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [requestWakeLock, bumpStreams, patch, sendMediaState, socketApi, cleanup]);

  // Final safety net: never leave the camera or microphone on after the chat screen closes.
  useEffect(
    () => () => {
      cleanup();
      r.current.call = null;
    },
    [cleanup]
  );

  const actions = useMemo(
    () => ({ startCall, accept, decline, hangup, toggleMic, toggleCamera, switchCamera, retryConnect, switchToAudioOnly }),
    [startCall, accept, decline, hangup, toggleMic, toggleCamera, switchCamera, retryConnect, switchToAudioOnly]
  );

  return useMemo(() => ({ call, streams, actions, fetchIce }), [call, streams, actions, fetchIce]);
}
