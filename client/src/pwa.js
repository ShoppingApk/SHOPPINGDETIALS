// Installable app support: registers the service worker and keeps Chrome's install prompt
// so the "Install app" banner can offer it later.

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function initPwa() {
  // Only in production builds: in development a service worker would get in the way of Vite.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* the site still works without it */
      });
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own banner instead of Chrome's mini-infobar
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export const canInstall = () => !!deferredPrompt && !isStandalone();

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Shows Chrome's install dialog. Resolves true if the user accepted.
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const e = deferredPrompt;
  deferredPrompt = null;
  notify();
  e.prompt();
  const choice = await e.userChoice.catch(() => null);
  return choice?.outcome === 'accepted';
}
