// Chat state (in memory only; discarded when the chat module unmounts on lock/panic).

export const initialState = {
  conversations: [],
  convStatus: 'loading', // loading | ready | error
  convError: '',
  activeId: null,
  threads: {}, // conversationId -> { items (oldest first), hasMore, status, error, stale }
  presence: {}, // userId -> { online, lastSeen }
  typing: {}, // conversationId -> true
  connection: 'connecting', // connecting | connected | reconnecting
  config: { images: false, maxTextLength: 2000, maxImageMB: 5 },
};

const RANK = { failed: -1, sending: 0, sent: 1, delivered: 2, read: 3 };
const emptyThread = { items: [], hasMore: true, status: 'idle', error: '', stale: false };
const id = (v) => String(v?._id ?? v ?? '');

const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || id(a).localeCompare(id(b));

// Merges messages by id; never downgrades a status (e.g. "read" stays "read").
function merge(items, incoming) {
  const map = new Map(items.map((m) => [id(m), m]));
  for (const m of incoming) {
    const prev = map.get(id(m));
    if (!prev) map.set(id(m), m);
    else map.set(id(m), { ...prev, ...m, status: RANK[prev.status] > RANK[m.status] ? prev.status : m.status });
  }
  return [...map.values()].sort(byTime);
}

const isLocal = (m) => m.status === 'sending' || m.status === 'failed';

function updateConv(state, conversationId, fn) {
  return state.conversations.map((c) => (id(c) === String(conversationId) ? fn(c) : c));
}

function bumpToTop(list, conversationId) {
  const i = list.findIndex((c) => id(c) === String(conversationId));
  if (i <= 0) return list;
  const copy = [...list];
  const [c] = copy.splice(i, 1);
  return [c, ...copy];
}

function presenceFrom(conversations, current) {
  const next = { ...current };
  for (const c of conversations) next[id(c.other)] = { online: !!c.other.online, lastSeen: c.other.lastSeen };
  return next;
}

export function reducer(state, a) {
  switch (a.type) {
    case 'CONFIG':
      return { ...state, config: { ...state.config, ...a.config } };

    case 'CONVERSATIONS':
      return { ...state, conversations: a.list, convStatus: 'ready', convError: '', presence: presenceFrom(a.list, state.presence) };

    case 'CONV_ERROR':
      return { ...state, convStatus: state.conversations.length ? 'ready' : 'error', convError: a.error };

    case 'CONV_UPSERT': {
      const exists = state.conversations.some((c) => id(c) === id(a.conversation));
      const conversations = exists
        ? updateConv(state, id(a.conversation), (c) => ({ ...c, ...a.conversation }))
        : [a.conversation, ...state.conversations];
      return { ...state, conversations, presence: presenceFrom([a.conversation], state.presence) };
    }

    case 'SET_ACTIVE':
      return { ...state, activeId: a.id };

    case 'THREAD_STATUS': {
      const t = state.threads[a.id] || emptyThread;
      return { ...state, threads: { ...state.threads, [a.id]: { ...t, status: a.status, error: a.error || '' } } };
    }

    case 'THREAD_LOADED': {
      const t = state.threads[a.id] || emptyThread;
      const asc = [...a.messages].reverse();
      const items =
        a.mode === 'older'
          ? merge(t.items, asc)
          : merge(t.items.filter(isLocal), asc); // latest page replaces (avoids gaps after reconnect), keeps unsent
      return {
        ...state,
        threads: { ...state.threads, [a.id]: { items, hasMore: a.hasMore, status: 'ready', error: '', stale: false } },
      };
    }

    case 'MARK_STALE': {
      const threads = {};
      for (const [k, t] of Object.entries(state.threads)) threads[k] = { ...t, stale: k !== state.activeId };
      return { ...state, threads };
    }

    // Adds a new/optimistic message, or replaces an optimistic one (tempId) with the saved one.
    case 'MESSAGE_ADD': {
      const m = a.message;
      const cid = id(m.conversation);
      const t = state.threads[cid];
      const threads = t
        ? { ...state.threads, [cid]: { ...t, items: merge(a.tempId ? t.items.filter((x) => id(x) !== a.tempId) : t.items, [m]) } }
        : state.threads;
      let conversations = updateConv(state, cid, (c) => {
        const newer = !c.lastMessage || id(c.lastMessage) === a.tempId || new Date(m.createdAt) >= new Date(c.lastMessage.createdAt);
        return {
          ...c,
          lastMessage: newer ? m : c.lastMessage,
          updatedAt: newer ? m.createdAt : c.updatedAt,
          unread: (c.unread || 0) + (a.countUnread ? 1 : 0),
        };
      });
      conversations = bumpToTop(conversations, cid);
      return { ...state, threads, conversations };
    }

    case 'MESSAGE_PATCH': {
      const cid = String(a.conversationId);
      const t = state.threads[cid];
      if (!t) return state;
      return {
        ...state,
        threads: { ...state.threads, [cid]: { ...t, items: t.items.map((m) => (id(m) === a.id ? { ...m, ...a.patch } : m)) } },
        conversations: updateConv(state, cid, (c) => (c.lastMessage && id(c.lastMessage) === a.id ? { ...c, lastMessage: { ...c.lastMessage, ...a.patch } } : c)),
      };
    }

    case 'STATUS': {
      const cid = String(a.conversationId);
      const ids = new Set(a.ids.map(String));
      const up = (m) => (ids.has(id(m)) && RANK[a.status] > RANK[m.status] ? { ...m, status: a.status } : m);
      const t = state.threads[cid];
      return {
        ...state,
        threads: t ? { ...state.threads, [cid]: { ...t, items: t.items.map(up) } } : state.threads,
        conversations: updateConv(state, cid, (c) => (c.lastMessage ? { ...c, lastMessage: up(c.lastMessage) } : c)),
      };
    }

    case 'DELETED': {
      const cid = String(a.conversationId);
      const t = state.threads[cid];
      let items = t?.items;
      if (t) items = a.scope === 'me' ? t.items.filter((m) => id(m) !== a.messageId) : t.items.map((m) => (id(m) === a.messageId ? { ...m, ...a.message } : m));
      const conversations = updateConv(state, cid, (c) => {
        if (!c.lastMessage || id(c.lastMessage) !== a.messageId) return c;
        if (a.scope === 'everyone') return { ...c, lastMessage: { ...c.lastMessage, ...a.message } };
        return { ...c, lastMessage: items?.length ? items[items.length - 1] : null };
      });
      return { ...state, conversations, threads: t ? { ...state.threads, [cid]: { ...t, items } } : state.threads };
    }

    case 'UNREAD':
      return { ...state, conversations: updateConv(state, a.id, (c) => ({ ...c, unread: a.value })) };

    case 'PRESENCE':
      return { ...state, presence: { ...state.presence, [a.userId]: { online: a.online, lastSeen: a.lastSeen ?? state.presence[a.userId]?.lastSeen } } };

    case 'TYPING': {
      const typing = { ...state.typing };
      if (a.typing) typing[a.conversationId] = true;
      else delete typing[a.conversationId];
      return { ...state, typing };
    }

    case 'CONNECTION':
      return { ...state, connection: a.state };

    default:
      return state;
  }
}

export const emptyThreadState = emptyThread;
