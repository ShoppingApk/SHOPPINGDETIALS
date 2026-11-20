import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const HOUR = 60 * 60 * 1000;

// Actions for one message (opened by long-press / right-click).
export default function MessageMenu({ msg, me, onClose, onDelete, onRetry }) {
  if (!msg) return null;
  const mine = String(msg.sender) === me;
  const local = String(msg._id).startsWith('tmp-');
  const canEveryone = mine && !local && !msg.deleted && Date.now() - new Date(msg.createdAt).getTime() < HOUR;

  const item = 'block w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-gray-50';
  const act = (fn) => () => {
    onClose();
    fn();
  };

  return (
    <Modal open onClose={onClose} title="Message" variant="sheet" size="sm">
      <div className="-mx-1">
        {msg.status === 'failed' && <button type="button" className={item} onClick={act(() => onRetry(msg))}>Retry sending</button>}
        {msg.text && !msg.deleted && navigator.clipboard && (
          <button
            type="button"
            className={item}
            onClick={act(() => navigator.clipboard.writeText(msg.text).then(() => toast.success('Copied'), () => toast.error('Could not copy')))}
          >
            Copy text
          </button>
        )}
        <button type="button" className={`${item} text-red-600`} onClick={act(() => onDelete(msg, 'me'))}>
          Delete for me
        </button>
        {canEveryone && (
          <button type="button" className={`${item} text-red-600`} onClick={act(() => onDelete(msg, 'everyone'))}>
            Delete for everyone
          </button>
        )}
        {mine && !local && !msg.deleted && !canEveryone && (
          <p className="px-3 py-2 text-xs text-gray-400">Messages can be deleted for everyone within 1 hour of sending.</p>
        )}
      </div>
    </Modal>
  );
}
