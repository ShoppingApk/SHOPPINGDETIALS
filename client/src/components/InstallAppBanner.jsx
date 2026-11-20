import { useEffect, useState } from 'react';
import { canInstall, onInstallChange, promptInstall } from '../pwa';

const DISMISS_KEY = 'kz_install_dismissed';
const DISMISS_DAYS = 30;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

// "Install the Kaasni app" card. Appears only when Chrome says the site can be installed
// (Android / desktop Chrome or Edge), never inside the installed app, and stays hidden
// for 30 days after "Not now".
export default function InstallAppBanner() {
  const [show, setShow] = useState(() => canInstall() && !dismissedRecently());

  useEffect(() => onInstallChange(() => setShow(canInstall() && !dismissedRecently())), []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    setShow(false);
  };

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:w-96"
      role="region"
      aria-label="Install app"
    >
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Get the Kaasni app</p>
        <p className="text-xs text-gray-500">Faster shopping, right from your home screen.</p>
      </div>
      <button type="button" onClick={dismiss} className="shrink-0 rounded-full px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100">
        Not now
      </button>
      <button type="button" onClick={() => promptInstall()} className="btn-primary shrink-0 px-4 py-1.5 text-sm">
        Install
      </button>
    </div>
  );
}
