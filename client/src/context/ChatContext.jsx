import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { unlockChat } from '../api/chat';

const INACTIVITY_MS = 10 * 60 * 1000; // lock after 10 minutes without interaction
const HIDDEN_MS = 2 * 60 * 1000; // lock when the tab stays hidden for 2 minutes
const TAP_WINDOW_MS = 3000; // 5 logo taps within 3 seconds
const TAPS_NEEDED = 5;
const ESC_WINDOW_MS = 600; // Escape pressed twice quickly = panic
const CHAT_PATH = '/c';

const ChatContext = createContext(null);

// Unlock state for private messaging. Kept in memory only (never written to storage), so a
// reload, logout, inactivity, a long-hidden tab or the panic action all lock it again.
// Does nothing at all unless the logged-in user's role is "chatuser".
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isChatUser = user?.role === 'chatuser';

  const [unlocked, setUnlocked] = useState(false);
  const [settings, setSettings] = useState({ hideOnTabSwitch: false, notify: false });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const lastActivity = useRef(Date.now());
  const taps = useRef([]);
  const lastEsc = useRef(0);
  const hiddenAt = useRef(0);
  const hiddenTimer = useRef(null);
  // True while an audio/video call is in progress: the inactivity and background auto-locks
  // are paused (a call is activity). Panic, logout and manual lock still work.
  const inCall = useRef(false);
  const setInCall = useCallback((on) => {
    inCall.current = on;
    lastActivity.current = Date.now();
  }, []);

  const leaveChatScreen = useCallback(() => {
    // replace: the Back button must not return to the chat screen.
    if (window.location.pathname === CHAT_PATH) navigate('/', { replace: true });
  }, [navigate]);

  const lock = useCallback(() => {
    clearTimeout(hiddenTimer.current);
    setUnlocked(false);
  }, []);

  const lockAndLeave = useCallback(() => {
    lock();
    leaveChatScreen();
  }, [lock, leaveChatScreen]);

  // Quick hide: lock, drop chat state (the chat module unmounts), clear toasts, go to the shop home.
  const panic = useCallback(() => {
    toast.remove();
    lock();
    leaveChatScreen();
  }, [lock, leaveChatScreen]);

  const openChat = useCallback(() => {
    if (!isChatUser) return;
    lastActivity.current = Date.now();
    setUnlocked(true);
    navigate(CHAT_PATH);
  }, [isChatUser, navigate]);

  // SearchBar hook: returns false (stop the search) only when the server accepts the keyword.
  const tryKeyword = useCallback(
    async (term) => {
      if (!isChatUser || term.length > 100) return true;
      let ok = false;
      try {
        ok = await unlockChat(term);
      } catch {
        ok = false;
      }
      if (!ok) return true; // not the keyword: carry on with a normal search
      openChat();
      return false;
    },
    [isChatUser, openChat]
  );

  // Logo hook: 5 taps within 3 seconds opens the chat; otherwise the logo works as usual.
  const onLogoTap = useCallback(
    (e) => {
      if (!isChatUser) return;
      const now = Date.now();
      taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
      if (taps.current.length >= TAPS_NEEDED) {
        taps.current = [];
        e.preventDefault();
        openChat();
      }
    },
    [isChatUser, openChat]
  );

  // Lock when the user logs out or is no longer a chatuser.
  useEffect(() => {
    if (!isChatUser) lock();
  }, [isChatUser, lock]);
  useEffect(() => {
    window.addEventListener('app:logout', lock);
    return () => window.removeEventListener('app:logout', lock);
  }, [lock]);

  // While unlocked: inactivity timer, hidden-tab rules and the double-Escape panic key.
  useEffect(() => {
    if (!unlocked) return undefined;
    lastActivity.current = Date.now();

    const bump = () => {
      lastActivity.current = Date.now();
    };
    const activity = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    activity.forEach((ev) => window.addEventListener(ev, bump, { passive: true, capture: true }));

    const idleCheck = setInterval(() => {
      if (inCall.current) lastActivity.current = Date.now();
      else if (Date.now() - lastActivity.current > INACTIVITY_MS) lockAndLeave();
    }, 15000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (settingsRef.current.hideOnTabSwitch) {
          panic();
          return;
        }
        hiddenAt.current = Date.now();
        // During a call the tab may sit in the background (phone screen off, other app).
        hiddenTimer.current = setTimeout(() => {
          if (!inCall.current) lockAndLeave();
        }, HIDDEN_MS);
      } else {
        clearTimeout(hiddenTimer.current);
        // Background timers can be throttled, so check the elapsed time too.
        if (hiddenAt.current && Date.now() - hiddenAt.current > HIDDEN_MS && !inCall.current) lockAndLeave();
        hiddenAt.current = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      if (now - lastEsc.current < ESC_WINDOW_MS) {
        lastEsc.current = 0;
        panic();
      } else {
        lastEsc.current = now;
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      activity.forEach((ev) => window.removeEventListener(ev, bump, { capture: true }));
      clearInterval(idleCheck);
      clearTimeout(hiddenTimer.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [unlocked, lockAndLeave, panic]);

  const value = useMemo(
    () => ({
      isChatUser,
      unlocked: unlocked && isChatUser,
      lock: lockAndLeave,
      panic,
      tryKeyword,
      onLogoTap,
      settings,
      setSettings,
      setInCall,
    }),
    [isChatUser, unlocked, lockAndLeave, panic, tryKeyword, onLogoTap, settings, setInCall]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
