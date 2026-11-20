import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useChatStore } from './useChatEngine';
import Avatar from './Avatar';
import Ticks from './Ticks';
import { callSummary, listTime } from './time';
import { EditIcon, GearIcon, HideIcon, SearchIcon } from './icons';

function preview(m, me) {
  if (!m) return { text: 'No messages yet', italic: true };
  if (m.deleted) return { text: 'This message was deleted', italic: true };
  const mine = String(m.sender) === me;
  if (m.kind === 'call') return { text: `${m.call?.type === 'video' ? '📹' : '📞'} ${callSummary(m, me).text}`, mine: false };
  const body = m.imageUrl && !m.text ? '📷 Photo' : m.text;
  return { text: body, mine };
}

function Row({ conv, active, online, typing, me, onOpen }) {
  const p = preview(conv.lastMessage, me);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(conv._id)}
        aria-current={active ? 'true' : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none ${active ? 'bg-brand-50/70' : ''}`}
      >
        <Avatar user={conv.other} online={online} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-gray-900">{conv.other.name}</span>
            <span className={`shrink-0 text-xs ${conv.unread ? 'font-semibold text-brand-600' : 'text-gray-400'}`}>
              {conv.lastMessage ? listTime(conv.lastMessage.createdAt) : ''}
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`flex min-w-0 items-center gap-1 text-sm ${p.italic ? 'italic text-gray-400' : 'text-gray-600'}`}>
              {typing ? (
                <span className="font-medium not-italic text-brand-600">typing…</span>
              ) : (
                <>
                  {p.mine && <Ticks status={conv.lastMessage.status} />}
                  <span className="truncate">{p.mine && !p.italic ? `You: ${p.text}` : p.text}</span>
                </>
              )}
            </span>
            {conv.unread > 0 && (
              <span className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white" aria-label={`${conv.unread} unread`}>
                {conv.unread > 99 ? '99+' : conv.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function ConversationList({ onNewChat, onSettings }) {
  const { state, actions, me } = useChatStore();
  const { panic } = useChat();
  const [filter, setFilter] = useState('');

  const list = filter.trim()
    ? state.conversations.filter((c) => c.other.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : state.conversations;

  const iconBtn = 'rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 border-b border-gray-100 px-3 py-2.5">
        <h1 className="flex-1 px-1 text-lg font-bold text-gray-900">Messages</h1>
        <button type="button" className={iconBtn} onClick={onNewChat} aria-label="New chat" title="New chat">
          <EditIcon width={20} height={20} />
        </button>
        <button type="button" className={iconBtn} onClick={onSettings} aria-label="Settings" title="Settings">
          <GearIcon width={20} height={20} />
        </button>
        <button type="button" className={iconBtn} onClick={panic} aria-label="Hide" title="Hide (Esc Esc)">
          <HideIcon width={20} height={20} />
        </button>
      </header>

      <div className="px-3 py-2">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.convStatus === 'loading' ? (
          <ul aria-busy="true" className="space-y-1 px-4 py-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex animate-pulse items-center gap-3 py-2">
                <span className="h-11 w-11 rounded-full bg-gray-200" />
                <span className="flex-1 space-y-2"><span className="block h-3 w-1/3 rounded bg-gray-200" /><span className="block h-3 w-2/3 rounded bg-gray-200" /></span>
              </li>
            ))}
          </ul>
        ) : state.convStatus === 'error' ? (
          <div className="p-6 text-center text-sm text-gray-600" role="alert">
            <p>{state.convError}</p>
            <button type="button" onClick={actions.loadConversations} className="btn-outline mt-3 py-1.5 text-sm">Try again</button>
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-800">{filter ? 'No matches' : 'No conversations yet'}</p>
            {!filter && (
              <>
                <p className="mt-1 text-sm text-gray-500">Start a new chat to say hello.</p>
                <button type="button" onClick={onNewChat} className="btn-primary mt-4 py-2 text-sm">New chat</button>
              </>
            )}
          </div>
        ) : (
          <ul>
            {list.map((c) => (
              <Row
                key={c._id}
                conv={c}
                me={me}
                active={state.activeId === c._id}
                online={!!state.presence[c.other._id]?.online}
                typing={!!state.typing[c._id]}
                onOpen={actions.openConversation}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
