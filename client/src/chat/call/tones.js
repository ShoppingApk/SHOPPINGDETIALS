// Ringtones generated with the Web Audio API (no audio files or external URLs).
//   incoming: a soft two-note chime, repeated every 2.4 s (+ vibration on phones)
//   outgoing: a gentle "ring ring" while the other side is being called

const PATTERNS = {
  incoming: {
    period: 2.4,
    notes: [
      { f: 880, at: 0, len: 0.18 },
      { f: 660, at: 0.22, len: 0.28 },
      { f: 880, at: 0.7, len: 0.18 },
      { f: 660, at: 0.92, len: 0.28 },
    ],
    volume: 0.18,
    vibrate: [300, 150, 300],
  },
  outgoing: {
    period: 3,
    notes: [
      { f: 425, at: 0, len: 0.4, f2: 450 },
      { f: 425, at: 0.6, len: 0.4, f2: 450 },
    ],
    volume: 0.06,
  },
};

export function playTone(kind) {
  const p = PATTERNS[kind];
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let timer = null;
  let stopped = false;

  const vibrate = () => {
    if (p.vibrate && navigator.vibrate) {
      try {
        navigator.vibrate(p.vibrate);
      } catch {
        /* not allowed */
      }
    }
  };

  const schedule = () => {
    if (!ctx || stopped) return;
    const start = ctx.currentTime + 0.05;
    for (const n of p.notes) {
      for (const f of [n.f, n.f2].filter(Boolean)) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const t0 = start + n.at;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(p.volume, t0 + 0.02);
        gain.gain.setValueAtTime(p.volume, t0 + n.len - 0.04);
        gain.gain.linearRampToValueAtTime(0, t0 + n.len);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + n.len + 0.02);
      }
    }
    vibrate();
  };

  if (Ctx) {
    try {
      ctx = new Ctx();
      ctx.resume?.().catch(() => {});
      schedule();
      timer = setInterval(schedule, p.period * 1000);
    } catch {
      ctx = null;
    }
  }
  if (!ctx && p.vibrate) {
    vibrate();
    timer = setInterval(vibrate, p.period * 1000);
  }

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      try {
        navigator.vibrate?.(0);
      } catch {
        /* ignore */
      }
      ctx?.close().catch(() => {});
    },
  };
}

// Short two-beep sound when a call ends.
export function playEndBeep() {
  const t = playTone('outgoing');
  setTimeout(() => t.stop(), 450);
}
