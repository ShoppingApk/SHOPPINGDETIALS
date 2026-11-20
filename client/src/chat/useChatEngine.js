import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_URL, errMsg, tokenStore } from '../api/client';
import { chatApi } from '../api/chatData';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { initialState, reducer } from './store';

export const ChatStoreContext = createContext(null);
export const useChatStore = () => useContext(ChatStoreContext);

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACK_TIMEOUT_MS = 15000;
const newTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const isLocalId = (v) => String(v).startsWith('tmp-');

// Generic, content-free notification (only while unlocked and enabled in settings).
function notifyGeneric() {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification('Kaasni', { body: 'You have a new update', tag: 'kz-update', icon: '/favicon.svg' });
    }
  } catch {
    /* notifications unsupported */
  }
}

export default function useChatEngine() {
  const { user } = useAuth();
  const chat = useChat();
  const me = String(user.id);
  const [state, dispatch] = useReducer(reducer, initialState);

  const stateRef = useRef(state);
  stateRef.current = state;
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const socketRef = useRef(null);
  const pending = useRef(new Map()); // tempId -> { cid, text?, file?, preview?, uploadedUrl? }
  const typingTimers = useRef({});

  // ---------- REST loaders ----------
  const loadConversations = useCallback(async () => {
    try {
      const { conversations } = await chatApi.conversations();
      dispatch({ type: 'CONVERSATIONS', list: conversations });
    } catch (err) {
      dispatch({ type: 'CONV_ERROR', error: errMsg(err, 'Could not load conversations') });
    }
  }, []);

  const loadLatest = useCallback(async (cid) => {
    dispatch({ type: 'THREAD_STATUS', id: cid, status: 'loading' });
    try {
      const data = await chatApi.messages(cid, { limit: 30 });
      dispatch({ type: 'THREAD_LOADED', id: cid, messages: data.messages, hasMore: data.hasMore, mode: 'latest' });
    } catch (err) {
      dispatch({ type: 'THREAD_STATUS', id: cid, status: 'error', error: errMsg(err, 'Could not load messages') });
    }
  }, []);

  const loadOlder = useCallback(async (cid) => {
    const t = stateRef.current.threads[cid];
    if (!t || t.status !== 'ready' || !t.hasMore) return;
    const oldest = t.items.find((m) => !isLocalId(m._id));
    if (!oldest) return;
    dispatch({ type: 'THREAD_STATUS', id: cid, status: 'loading-older' });
    try {
      const data = await chatApi.messages(cid, { before: oldest._id, limit: 30 });
      dispatch({ type: 'THREAD_LOADED', id: cid, messages: data.messages, hasMore: data.hasMore, mode: 'older' });
    } catch (err) {
      dispatch({ type: 'THREAD_STATUS', id: cid, status: 'ready' });
      toast.error(errMsg(err, 'Could not load older messages'));
    }
  }, []);

  // ---------- receipts ----------
  const markRead = useCallback((cid) => {
    socketRef.current?.emit('message:read', { conversationId: cid });
    dispatch({ type: 'UNREAD', id: cid, value: 0 });
  }, []);

  // ---------- socket ----------
  useEffect(() => {
    let connectedBefore = false;
    chatApi.config().then((config) => dispatch({ type: 'CONFIG', config })).catch(() => {});
    loadConversations();

    const s = io(API_URL, {
      auth: { token: tokenStore.get() }, // handshake auth, never the query string
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true, // fresh connection per mount; never reuse a manager closed by a previous unmount
      autoConnect: false, // connected below, one tick later
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      dispatch({ type: 'CONNECTION', state: 'connected' });
      if (connectedBefore) {
        // Catch up on anything missed while disconnected.
        loadConversations();
        dispatch({ type: 'MARK_STALE' });
        const active = stateRef.current.activeId;
        if (active) {
          loadLatest(active);
          if (document.visibilityState === 'visible') s.emit('message:read', { conversationId: active });
        }
      }
      connectedBefore = true;
    });
    s.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        chatRef.current.lock(); // removed by the server (e.g. account disabled)
        return;
      }
      if (reason !== 'io client disconnect') dispatch({ type: 'CONNECTION', state: 'reconnecting' });
    });
    s.on('connect_error', (err) => {
      if (err?.message === 'unauthorized') {
        s.disconnect();
        chatRef.current.lock();
        return;
      }
      dispatch({ type: 'CONNECTION', state: connectedBefore ? 'reconnecting' : 'connecting' });
    });

    s.on('message:new', ({ message, tempId }) => {
      const st = stateRef.current;
      const cid = String(message.conversation);
      const mine = String(message.sender) === me;
      const viewing = st.activeId === cid && document.visibilityState === 'visible';
      dispatch({ type: 'MESSAGE_ADD', message, tempId, countUnread: !mine && !viewing });
      if (!st.conversations.some((c) => String(c._id) === cid)) loadConversations();
      if (mine) return;
      dispatch({ type: 'TYPING', conversationId: cid, typing: false });
      if (viewing) s.emit('message:read', { conversationId: cid });
      else s.emit('message:delivered', { messageIds: [message._id] });
      if (document.visibilityState === 'hidden' && chatRef.current.settings.notify) notifyGeneric();
    });
    s.on('message:delivered', ({ conversationId, messageIds }) => dispatch({ type: 'STATUS', conversationId, ids: messageIds, status: 'delivered' }));
    s.on('message:read', ({ conversationId, messageIds, readerId }) => {
      if (String(readerId) === me) dispatch({ type: 'UNREAD', id: conversationId, value: 0 }); // read in my other tab
      else dispatch({ type: 'STATUS', conversationId, ids: messageIds, status: 'read' });
    });
    s.on('message:deleted', ({ conversationId, messageId, scope, message }) => dispatch({ type: 'DELETED', conversationId, messageId, scope, message }));

    const setTyping = (conversationId, typing) => {
      clearTimeout(typingTimers.current[conversationId]);
      dispatch({ type: 'TYPING', conversationId, typing });
      if (typing) typingTimers.current[conversationId] = setTimeout(() => dispatch({ type: 'TYPING', conversationId, typing: false }), 6000);
    };
    s.on('typing:start', ({ conversationId }) => setTyping(conversationId, true));
    s.on('typing:stop', ({ conversationId }) => setTyping(conversationId, false));
    s.on('presence:online', ({ userId }) => dispatch({ type: 'PRESENCE', userId, online: true }));
    s.on('presence:offline', ({ userId, lastSeen }) => dispatch({ type: 'PRESENCE', userId, online: false, lastSeen }));

    // Deferred so a mount that is immediately undone (React StrictMode in development)
    // never opens a connection it would have to abort.
    const connectTimer = setTimeout(() => s.connect(), 0);

    const timers = typingTimers.current;
    const pend = pending.current;
    return () => {
      clearTimeout(connectTimer);
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      Object.values(timers).forEach(clearTimeout);
      pend.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      pend.clear();
    };
  }, [me, loadConversations, loadLatest]);

  // Mark the open conversation read when the tab becomes visible again.
  useEffect(() => {
    const onVis = () => {
      const { activeId, conversations } = stateRef.current;
      if (document.visibilityState === 'visible' && activeId && conversations.find((c) => c._id === activeId)?.unread) markRead(activeId);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [markRead]);

  // ---------- conversations ----------
  const openConversation = useCallback(
    (cid) => {
      dispatch({ type: 'SET_ACTIVE', id: cid });
      if (!cid) return;
      const t = stateRef.current.threads[cid];
      if (!t || t.stale || t.status === 'idle' || t.status === 'error') loadLatest(cid);
      markRead(cid);
    },
    [loadLatest, markRead]
  );

  const startChatWith = useCallback(
    async (userId) => {
      const { conversation } = await chatApi.open(userId);
      dispatch({ type: 'CONV_UPSERT', conversation });
      openConversation(conversation._id);
      return conversation;
    },
    [openConversation]
  );

  // ---------- sending ----------
  const emitSend = useCallback((cid, tempId, payload) => {
    const s = socketRef.current;
    if (!s) return;
    s.timeout(ACK_TIMEOUT_MS).emit('message:send', { conversationId: cid, ...payload, tempId }, (err, res) => {
      if (err || !res?.ok) {
        dispatch({ type: 'MESSAGE_PATCH', conversationId: cid, id: tempId, patch: { status: 'failed', error: res?.error || 'Not sent' } });
        return;
      }
      dispatch({ type: 'MESSAGE_ADD', message: res.message, tempId });
      const p = pending.current.get(tempId);
      if (p?.preview) URL.revokeObjectURL(p.preview);
      pending.current.delete(tempId);
    });
  }, []);

  const addOptimistic = useCallback(
    (cid, fields) => {
      const conv = stateRef.current.conversations.find((c) => c._id === cid);
      const tempId = newTempId();
      dispatch({
        type: 'MESSAGE_ADD',
        message: {
          _id: tempId,
          conversation: cid,
          sender: me,
          receiver: conv?.other?._id,
          text: '',
          imageUrl: '',
          deleted: false,
          status: 'sending',
          createdAt: new Date().toISOString(),
          ...fields,
        },
      });
      return tempId;
    },
    [me]
  );

  const sendText = useCallback(
    (cid, raw) => {
      const text = raw.trim();
      if (!text) return;
      if (text.length > stateRef.current.config.maxTextLength) {
        toast.error(`Messages can be at most ${stateRef.current.config.maxTextLength} characters`);
        return;
      }
      const tempId = addOptimistic(cid, { text });
      pending.current.set(tempId, { cid, text });
      emitSend(cid, tempId, { text });
    },
    [addOptimistic, emitSend]
  );

  const uploadAndSend = useCallback(
    async (tempId) => {
      const p = pending.current.get(tempId);
      if (!p) return;
      try {
        const { url } = await chatApi.upload(p.file);
        p.uploadedUrl = url;
        emitSend(p.cid, tempId, { imageUrl: url });
      } catch (err) {
        dispatch({ type: 'MESSAGE_PATCH', conversationId: p.cid, id: tempId, patch: { status: 'failed', error: errMsg(err, 'Upload failed') } });
      }
    },
    [emitSend]
  );

  const sendImage = useCallback(
    (cid, file) => {
      const { maxImageMB } = stateRef.current.config;
      if (!IMAGE_TYPES.includes(file.type)) return toast.error('Only JPG, PNG or WEBP images can be sent');
      if (file.size > maxImageMB * 1024 * 1024) return toast.error(`Images must be ${maxImageMB} MB or smaller`);
      const preview = URL.createObjectURL(file);
      const tempId = addOptimistic(cid, { imageUrl: preview });
      pending.current.set(tempId, { cid, file, preview });
      return uploadAndSend(tempId);
    },
    [addOptimistic, uploadAndSend]
  );

  const retry = useCallback(
    (msg) => {
      const p = pending.current.get(msg._id);
      if (!p) return;
      dispatch({ type: 'MESSAGE_PATCH', conversationId: p.cid, id: msg._id, patch: { status: 'sending', error: '' } });
      if (p.file && !p.uploadedUrl) uploadAndSend(msg._id);
      else emitSend(p.cid, msg._id, p.uploadedUrl ? { imageUrl: p.uploadedUrl } : { text: p.text });
    },
    [emitSend, uploadAndSend]
  );

  const deleteMessage = useCallback((msg, scope) => {
    const cid = String(msg.conversation);
    if (isLocalId(msg._id)) {
      const p = pending.current.get(msg._id);
      if (p?.preview) URL.revokeObjectURL(p.preview);
      pending.current.delete(msg._id);
      dispatch({ type: 'DELETED', conversationId: cid, messageId: msg._id, scope: 'me' });
      return;
    }
    socketRef.current?.timeout(ACK_TIMEOUT_MS).emit('message:delete', { messageId: msg._id, scope }, (err, res) => {
      if (err || !res?.ok) {
        toast.error(res?.error || 'Could not delete the message');
        return;
      }
      dispatch({ type: 'DELETED', conversationId: cid, messageId: res.messageId, scope: res.scope, message: res.message });
    });
  }, []);

  // ---------- typing ----------
  const typing = useCallback((cid, on) => {
    socketRef.current?.emit(on ? 'typing:start' : 'typing:stop', { conversationId: cid });
  }, []);

  const actions = useMemo(
    () => ({ loadConversations, loadLatest, loadOlder, openConversation, startChatWith, sendText, sendImage, retry, deleteMessage, typing, markRead }),
    [loadConversations, loadLatest, loadOlder, openConversation, startChatWith, sendText, sendImage, retry, deleteMessage, typing, markRead]
  );

  return useMemo(() => ({ state, actions, me }), [state, actions, me]);
}
