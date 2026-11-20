import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import { chatApi } from '../../api/chatData';

const GATHER_MS = 8000;

const LABELS = {
  host: 'Local network (host)',
  srflx: 'Public address via STUN (srflx)',
  prflx: 'Peer reflexive (prflx)',
  relay: 'TURN relay (relay)',
};

// Gathers ICE candidates with the server's ICE list and reports which kinds work.
// Nothing is sent anywhere: the test connection only talks to the STUN/TURN servers.
async function runTest(signal) {
  const ice = await chatApi.iceServers();
  const pc = new RTCPeerConnection({ iceServers: ice.iceServers, iceCandidatePoolSize: 0 });
  const found = { host: [], srflx: [], prflx: [], relay: [] };
  try {
    pc.createDataChannel('test');
    const done = new Promise((resolve) => {
      const timer = setTimeout(resolve, GATHER_MS);
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(timer);
          resolve();
          return;
        }
        const type = candidate.type || /typ (\w+)/.exec(candidate.candidate)?.[1];
        const protocol = (candidate.protocol || /udp|tcp/i.exec(candidate.candidate)?.[0] || '').toLowerCase();
        const relayProtocol = candidate.relayProtocol || '';
        if (found[type]) found[type].push({ protocol, relayProtocol });
      };
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await pc.setLocalDescription(await pc.createOffer());
    await done;
  } finally {
    pc.close();
  }
  return { ice, found };
}

export default function CallTestPanel({ open, onClose }) {
  const [state, setState] = useState({ status: 'idle' });
  const abortRef = useRef(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (!window.RTCPeerConnection) {
      setState({ status: 'error', error: 'This browser does not support calls.' });
      return;
    }
    setState({ status: 'running' });
    try {
      const result = await runTest(ctrl.signal);
      if (!ctrl.signal.aborted) setState({ status: 'done', ...result });
    } catch {
      if (!ctrl.signal.aborted) setState({ status: 'error', error: 'The test could not run. Check your internet connection and try again.' });
    }
  }, []);

  useEffect(() => {
    if (open) start();
    return () => abortRef.current?.abort();
  }, [open, start]);

  const { ice, found } = state;
  const relayOk = found?.relay.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Call test" variant="sheet" size="sm">
      {state.status === 'running' && (
        <p className="flex items-center gap-2 py-4 text-sm text-gray-600" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" aria-hidden="true" />
          Checking connection paths (up to {GATHER_MS / 1000} seconds)…
        </p>
      )}
      {state.status === 'error' && <p className="py-4 text-sm text-red-600" role="alert">{state.error}</p>}
      {state.status === 'done' && (
        <div className="space-y-4 text-sm">
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {Object.keys(LABELS).filter((k) => k !== 'prflx' || found.prflx.length).map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-gray-800">{LABELS[k]}</span>
                <span className={`shrink-0 font-semibold ${found[k].length ? 'text-green-700' : 'text-gray-400'}`}>
                  {found[k].length ? `✓ ${[...new Set(found[k].map((c) => c.relayProtocol || c.protocol))].filter(Boolean).join(', ') || 'found'}` : 'none'}
                </span>
              </li>
            ))}
          </ul>

          {relayOk ? (
            <p className="rounded-xl bg-green-50 p-3 text-green-800">
              <strong>TURN relay is working.</strong> Calls can connect even on strict mobile or office networks.
            </p>
          ) : ice?.turn ? (
            <p className="rounded-xl bg-red-50 p-3 text-red-800">
              <strong>TURN relay is NOT working.</strong> A TURN server is configured ({ice.provider}) but gave no relay address. Check the TURN credentials and that its ports are open (see README, Calls).
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
              <strong>STUN only: calls may fail on some mobile or strict networks.</strong> No TURN relay is configured. Most home Wi-Fi calls still work. See README, Calls, for free TURN options.
            </p>
          )}

          {!found.srflx.length && (
            <p className="text-xs text-gray-500">No public (STUN) address was found: this network may block UDP. A TURN relay over TCP/TLS is needed here.</p>
          )}
          <p className="text-xs text-gray-500">Server setting: {ice?.provider || 'none'}. This test only contacts the STUN/TURN servers; nothing is recorded.</p>
        </div>
      )}
      <button type="button" onClick={start} disabled={state.status === 'running'} className="btn-outline mt-4 w-full">
        Run again
      </button>
    </Modal>
  );
}
