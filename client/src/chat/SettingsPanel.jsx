import { useState } from 'react';
import toast from 'react-hot-toast';
import CallTestPanel from './call/CallTestPanel';
import Modal from '../components/Modal';
import { useChat } from '../context/ChatContext';
import { LockIcon } from './icons';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// Settings live in memory only and reset after a page reload.
export default function SettingsPanel({ open, onClose }) {
  const { settings, setSettings, lock } = useChat();
  const [testOpen, setTestOpen] = useState(false);

  const setNotify = async (on) => {
    if (!on) return setSettings((s) => ({ ...s, notify: false }));
    if (!('Notification' in window)) return toast.error('Notifications are not supported in this browser');
    const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (perm !== 'granted') return toast.error('Notifications are blocked in your browser settings');
    return setSettings((s) => ({ ...s, notify: true }));
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Settings" variant="sheet" size="sm">
        <div className="divide-y divide-gray-100">
          <Toggle
            label="Hide when I switch tabs"
            hint="Instantly hides this screen if you switch to another tab or app."
            checked={settings.hideOnTabSwitch}
            onChange={(v) => setSettings((s) => ({ ...s, hideOnTabSwitch: v }))}
          />
          <Toggle
            label="Notifications"
            hint="Shows a generic “new update” alert while this screen is unlocked and the tab is in the background. No names or text."
            checked={settings.notify}
            onChange={setNotify}
          />
          <div className="space-y-1 py-3 text-xs text-gray-500">
            <p>Quick hide: press <kbd className="rounded border px-1">Esc</kbd> twice, or tap the hide button.</p>
            <p>Locks automatically after 10 minutes of inactivity or 2 minutes in the background (not during a call). Locking or hiding ends any call.</p>
          </div>
          <div className="py-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                setTestOpen(true);
              }}
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-sm font-medium text-gray-900">Call test</span>
                <span className="block text-xs text-gray-500">Check whether voice and video calls can connect on this network.</span>
              </span>
              <span aria-hidden="true" className="text-gray-400">›</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            lock();
          }}
          className="btn-outline mt-2 w-full"
        >
          <LockIcon width={18} height={18} /> Lock now
        </button>
      </Modal>
      <CallTestPanel open={testOpen} onClose={() => setTestOpen(false)} />
    </>
  );
}
