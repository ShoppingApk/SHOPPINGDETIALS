import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import useDebounce from '../hooks/useDebounce';
import { chatApi } from '../api/chatData';
import { errMsg, isCancel } from '../api/client';
import Avatar from './Avatar';
import { lastSeenLabel } from './time';

// Search other chatusers and start (or reopen) a conversation.
export default function NewChatPanel({ open, onClose, onStart, presence }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const term = useDebounce(q.trim(), 250);

  useEffect(() => {
    if (!open) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    chatApi
      .users(term, ctrl.signal)
      .then((d) => setUsers(d.users))
      .catch((err) => !isCancel(err) && setError(errMsg(err, 'Could not load people')))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [open, term]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const start = async (u) => {
    setBusyId(u._id);
    try {
      await onStart(u._id);
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Could not start the chat'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New chat" variant="sheet">
      <label className="sr-only" htmlFor="people-search">Search people</label>
      <input id="people-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="input" autoComplete="off" />
      <div className="mt-3 min-h-[8rem]">
        {error ? (
          <p className="py-6 text-center text-sm text-red-600" role="alert">{error}</p>
        ) : loading && !users.length ? (
          <p className="py-6 text-center text-sm text-gray-500">Searching…</p>
        ) : !users.length ? (
          <p className="py-6 text-center text-sm text-gray-500">{term ? 'Nobody found' : 'No one else is here yet'}</p>
        ) : (
          <ul className="-mx-1">
            {users.map((u) => {
              const online = presence[u._id]?.online ?? u.online;
              return (
                <li key={u._id}>
                  <button type="button" onClick={() => start(u)} disabled={!!busyId} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60">
                    <Avatar user={u} size={40} online={online} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.name}</span>
                      <span className="block text-xs text-gray-500">{online ? 'online' : lastSeenLabel(presence[u._id]?.lastSeen ?? u.lastSeen)}</span>
                    </span>
                    {busyId === u._id && <span className="text-xs text-gray-400">Opening…</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
