import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '../Avatar';
import { useCallCtx } from './useCall';
import { canChooseOutput, listDevices } from './media';
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, SpeakerIcon, SwitchCameraIcon, VideoIcon, VideoOffIcon } from '../icons';

const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
};

const SAFE = {
  paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
  paddingLeft: 'env(safe-area-inset-left, 0px)',
  paddingRight: 'env(safe-area-inset-right, 0px)',
};

// Attaches a MediaStream to a <video>/<audio> element and starts playback.
function useMediaElement(stream, version, onBlocked) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) {
      const p = el.play?.();
      p?.catch?.((err) => err?.name === 'NotAllowedError' && onBlocked?.());
    }
  }, [stream, version, onBlocked]);
  return ref;
}

function Timer({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{fmt(Math.max(0, Math.floor((now - since) / 1000)))}</span>;
}

function QualityBars({ quality }) {
  const n = quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
  const color = quality === 'good' ? 'bg-green-400' : quality === 'fair' ? 'bg-amber-400' : 'bg-red-500';
  return (
    <span className="inline-flex items-end gap-0.5" role="img" aria-label={`Connection ${quality}`} title={`Connection: ${quality}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-1 rounded-sm ${i <= n ? color : 'bg-white/30'}`} style={{ height: 4 + i * 4 }} />
      ))}
    </span>
  );
}

function RoundButton({ onClick, label, active = false, danger = false, success = false, children, disabled = false, big = false }) {
  const tone = danger
    ? 'bg-red-600 text-white hover:bg-red-500'
    : success
      ? 'bg-green-600 text-white hover:bg-green-500'
      : active
        ? 'bg-white text-gray-900 hover:bg-gray-100'
        : 'bg-white/15 text-white hover:bg-white/25';
  return (
    <span className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`grid place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 disabled:opacity-40 ${big ? 'h-16 w-16' : 'h-14 w-14'} ${tone}`}
      >
        {children}
      </button>
      <span className="text-[11px] font-medium text-white/80">{label}</span>
    </span>
  );
}

// ---------- incoming ----------

function IncomingCall({ call, actions }) {
  const acceptRef = useRef(null);
  useEffect(() => acceptRef.current?.focus(), []);
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-gray-900 via-gray-900 to-brand-900 text-white"
      style={{ ...SAFE, height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming ${call.type === 'video' ? 'video' : 'voice'} call from ${call.peer.name}`}
    >
      <div className="mt-[12vh] flex flex-col items-center px-6 text-center">
        <span className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" aria-hidden="true" />
          <Avatar user={call.peer} size={112} />
        </span>
        <h2 className="mt-6 max-w-[80vw] truncate text-2xl font-semibold">{call.peer.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
          {call.type === 'video' ? <VideoIcon width={16} height={16} /> : <PhoneIcon width={16} height={16} />}
          Incoming {call.type === 'video' ? 'video' : 'voice'} call
        </p>
      </div>
      <div className="mb-[8vh] flex w-full max-w-xs items-center justify-around">
        <RoundButton onClick={actions.decline} label="Decline" danger big>
          <PhoneOffIcon width={28} height={28} />
        </RoundButton>
        <span className="flex flex-col items-center gap-1.5">
          <button
            ref={acceptRef}
            type="button"
            onClick={actions.accept}
            aria-label="Accept"
            className="grid h-16 w-16 animate-bounce place-items-center rounded-full bg-green-600 text-white hover:bg-green-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            {call.type === 'video' ? <VideoIcon width={28} height={28} /> : <PhoneIcon width={28} height={28} />}
          </button>
          <span className="text-[11px] font-medium text-white/80">Accept</span>
        </span>
      </div>
    </div>
  );
}

// ---------- draggable self view ----------

function LocalPreview({ stream, version, mirrored, hidden }) {
  const ref = useMediaElement(stream, version);
  const box = useRef(null);
  const drag = useRef(null);
  const [pos, setPos] = useState(null);

  const onPointerDown = (e) => {
    const el = box.current;
    const parent = el?.parentElement?.getBoundingClientRect();
    if (!el || !parent) return;
    const rect = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, parent, w: rect.width, h: rect.height };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const x = Math.min(Math.max(8, e.clientX - d.parent.left - d.dx), d.parent.width - d.w - 8);
    const y = Math.min(Math.max(8, e.clientY - d.parent.top - d.dy), d.parent.height - d.h - 8);
    setPos({ x, y });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute z-10 w-28 touch-none select-none overflow-hidden rounded-xl bg-gray-800 shadow-lg ring-1 ring-white/20 sm:w-40 ${pos ? '' : 'right-3 top-20'} ${hidden ? 'hidden' : ''}`}
      style={{ aspectRatio: '3 / 4', cursor: 'grab', ...(pos ? { left: pos.x, top: pos.y } : {}) }}
      aria-label="Your camera (drag to move)"
    >
      <video ref={ref} autoPlay playsInline muted className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`} />
    </div>
  );
}

// ---------- speaker / output device ----------

function OutputPicker({ audioRef }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('default');

  useEffect(() => {
    if (!canChooseOutput()) return undefined;
    const load = () => listDevices('audiooutput').then(setDevices);
    load();
    navigator.mediaDevices?.addEventListener?.('devicechange', load);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', load);
  }, []);

  if (devices.length < 2) return null;
  const choose = async (id) => {
    try {
      await audioRef.current?.setSinkId(id);
      setCurrent(id);
    } catch {
      /* device gone */
    }
    setOpen(false);
  };
  return (
    <span className="relative">
      <RoundButton onClick={() => setOpen((o) => !o)} label="Speaker">
        <SpeakerIcon />
      </RoundButton>
      {open && (
        <ul className="absolute bottom-full left-1/2 z-20 mb-2 max-h-60 w-60 -translate-x-1/2 overflow-auto rounded-xl bg-white py-1 text-sm text-gray-900 shadow-xl" role="listbox" aria-label="Audio output">
          {devices.map((d, i) => (
            <li key={d.deviceId || i}>
              <button
                type="button"
                role="option"
                aria-selected={current === d.deviceId}
                onClick={() => choose(d.deviceId)}
                className={`block w-full truncate px-3 py-2 text-left hover:bg-gray-100 ${current === d.deviceId ? 'font-semibold text-brand-700' : ''}`}
              >
                {d.label || `Speaker ${i + 1}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

// ---------- outgoing / in call ----------

function CallScreen({ call, streams, actions }) {
  const [soundBlocked, setSoundBlocked] = useState(false);
  const onBlocked = useCallback(() => setSoundBlocked(true), []);
  const audioRef = useMediaElement(streams.remote, streams.v, onBlocked);
  const remoteVideoRef = useMediaElement(streams.remote, streams.v);
  const [hasCams, setHasCams] = useState(false);

  useEffect(() => {
    if (call.type === 'video') listDevices('videoinput').then((d) => setHasCams(d.length > 1));
  }, [call.type, call.camOn]);

  const remoteVideoLive = !!streams.remote?.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted);
  const showRemoteVideo = call.type === 'video' && remoteVideoLive && call.remote.video && !call.remote.videoPaused && ['active', 'reconnecting'].includes(call.phase);
  const localVideoLive = !!streams.local?.getVideoTracks().some((t) => t.readyState === 'live');

  const status = {
    starting: 'Calling…',
    calling: 'Calling…',
    ringing: 'Ringing…',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    ended: call.endLabel,
  }[call.phase];

  const poor = call.quality === 'poor' || call.localVideoPaused || call.remote.videoPaused;
  const inCall = ['active', 'reconnecting'].includes(call.phase);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gray-900 text-white"
      style={{ ...SAFE, height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${call.type === 'video' ? 'Video' : 'Voice'} call with ${call.peer.name}`}
    >
      {/* Remote audio always plays through this element (also for video calls). */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Remote video fills the screen; avatar when there is no video. */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full bg-black object-cover ${showRemoteVideo ? '' : 'invisible'}`}
      />
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-brand-900 px-6 text-center">
          <Avatar user={call.peer} size={120} />
          {call.type === 'video' && inCall && (
            <p className="mt-4 text-sm text-white/70">{call.remote.videoPaused ? 'Video paused: poor connection' : !call.remote.video ? 'Camera is off' : ''}</p>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-3 text-center drop-shadow">
        <h2 className="max-w-[80vw] truncate text-xl font-semibold">{call.peer.name}</h2>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-white/85" aria-live="polite">
          {call.phase === 'active' && call.connectedAt ? <Timer since={call.connectedAt} /> : status}
          {inCall && <QualityBars quality={call.quality || 'good'} />}
        </p>
        {inCall && poor && <p className="mt-1 rounded-full bg-amber-500/90 px-3 py-0.5 text-xs font-semibold text-gray-900">Poor connection</p>}
        {call.phase === 'active' && call.peerSignalLost && <p className="mt-1 text-xs text-white/70">Connection unstable…</p>}
        {!call.micOn && inCall && <p className="mt-1 text-xs text-white/70">You are muted</p>}
        {call.remote.audio === false && inCall && <p className="mt-1 text-xs text-white/70">{call.peer.name} is muted</p>}
      </div>

      {call.type === 'video' && call.camOn && localVideoLive && call.phase !== 'ended' && (
        <LocalPreview stream={streams.local} version={streams.v} mirrored={(call.facing || 'user') === 'user'} />
      )}

      {soundBlocked && (
        <button
          type="button"
          onClick={() => {
            audioRef.current?.play().then(() => setSoundBlocked(false)).catch(() => {});
          }}
          className="relative z-10 mx-auto mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900"
        >
          Tap to turn on sound
        </button>
      )}

      {/* Could not connect */}
      {call.failed && call.phase !== 'ended' && (
        <div className="relative z-20 mx-auto mt-auto w-[min(92vw,24rem)] rounded-2xl bg-white p-5 text-center text-gray-900 shadow-xl" role="alert">
          <p className="font-semibold">Could not connect on this network</p>
          <p className="mt-1 text-sm text-gray-600">Try again, or switch to audio only. A different network (Wi-Fi or mobile data) may also help.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={actions.retryConnect} className="btn-primary py-2 text-sm">Retry</button>
            {call.type === 'video' && call.camOn && (
              <button type="button" onClick={actions.switchToAudioOnly} className="btn-outline py-2 text-sm">Switch to audio only</button>
            )}
            <button type="button" onClick={actions.hangup} className="btn-outline py-2 text-sm text-red-600">End call</button>
          </div>
        </div>
      )}

      {/* Controls */}
      {call.phase !== 'ended' && (
        <div className="relative z-10 mt-auto flex flex-wrap items-end justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent px-4 pb-2 pt-10 sm:gap-6">
          <RoundButton onClick={actions.toggleMic} label={call.micOn ? 'Mute' : 'Unmute'} active={!call.micOn}>
            {call.micOn ? <MicIcon /> : <MicOffIcon />}
          </RoundButton>
          {call.type === 'video' && (
            <RoundButton onClick={actions.toggleCamera} label={call.camOn ? 'Camera off' : 'Camera on'} active={!call.camOn}>
              {call.camOn ? <VideoIcon /> : <VideoOffIcon />}
            </RoundButton>
          )}
          {call.type === 'video' && hasCams && call.camOn && (
            <RoundButton onClick={actions.switchCamera} label="Flip">
              <SwitchCameraIcon />
            </RoundButton>
          )}
          <OutputPicker audioRef={audioRef} />
          <RoundButton onClick={actions.hangup} label="End" danger>
            <PhoneOffIcon />
          </RoundButton>
        </div>
      )}
      {call.phase === 'ended' && <div className="mt-auto" />}
    </div>
  );
}

export default function CallOverlay() {
  const ctx = useCallCtx();
  if (!ctx?.call) return null;
  const { call, streams, actions } = ctx;
  if (call.phase === 'incoming') return <IncomingCall call={call} actions={actions} />;
  return <CallScreen call={call} streams={streams} actions={actions} />;
}
