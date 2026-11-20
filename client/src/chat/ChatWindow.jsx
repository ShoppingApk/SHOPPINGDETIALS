import { useCallback, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useChatStore } from './useChatEngine';
import Avatar from './Avatar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MessageMenu from './MessageMenu';
import ImageViewer from './ImageViewer';
import { lastSeenLabel } from './time';
import { ArrowLeftIcon, HideIcon } from './icons';

export default function ChatWindow({ conversation }) {
  const { state, actions, me } = useChatStore();
  const { panic } = useChat();
  const [menuMsg, setMenuMsg] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const cid = conversation._id;
  const thread = state.threads[cid];
  const typing = !!state.typing[cid];
  const presence = state.presence[conversation.other._id] || {};
  const status = typing ? 'typing…' : presence.online ? 'online' : lastSeenLabel(presence.lastSeen ?? conversation.other.lastSeen);

  const onLoadOlder = useCallback(() => actions.loadOlder(cid), [actions, cid]);
  const closeImage = useCallback(() => setImageUrl(null), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-gray-100 bg-white px-2 py-2">
        <button
          type="button"
          onClick={() => actions.openConversation(null)}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeftIcon />
        </button>
        <Avatar user={conversation.other} size={40} online={!!presence.online} />
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate font-semibold leading-tight text-gray-900">{conversation.other.name}</h2>
          <p className={`truncate text-xs ${typing || presence.online ? 'text-brand-600' : 'text-gray-500'}`} aria-live="polite">{status}</p>
        </div>
        <button type="button" onClick={panic} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Hide" title="Hide (Esc Esc)">
          <HideIcon width={20} height={20} />
        </button>
      </header>

      {thread?.status === 'error' && !thread.items.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f4f1f7] p-6 text-center text-sm text-gray-600" role="alert">
          <p>{thread.error}</p>
          <button type="button" onClick={() => actions.loadLatest(cid)} className="btn-outline py-1.5 text-sm">Try again</button>
        </div>
      ) : (
        <MessageList
          conversationId={cid}
          thread={thread}
          me={me}
          typing={typing}
          onLoadOlder={onLoadOlder}
          onMenu={setMenuMsg}
          onOpenImage={setImageUrl}
          onRetry={actions.retry}
        />
      )}

      <MessageInput
        conversationId={cid}
        maxLength={state.config.maxTextLength}
        imagesEnabled={state.config.images}
        onSendText={actions.sendText}
        onSendImage={actions.sendImage}
        onTyping={actions.typing}
      />

      <MessageMenu msg={menuMsg} me={me} onClose={() => setMenuMsg(null)} onDelete={actions.deleteMessage} onRetry={actions.retry} />
      <ImageViewer url={imageUrl} onClose={closeImage} />
    </div>
  );
}
