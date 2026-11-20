import { useEffect, useState } from 'react';
import useChatEngine, { ChatStoreContext } from './useChatEngine';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewChatPanel from './NewChatPanel';
import SettingsPanel from './SettingsPanel';

const SHOP_TITLE = 'Kaasni - Shop Online';

// Keeps the normal shop title and asks search engines not to index this route.
function usePrivacyHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SHOP_TITLE;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
      document.title = prevTitle || SHOP_TITLE;
    };
  }, []);
}

function ConnectionBanner({ connection }) {
  const [show, setShow] = useState(false);
  // Don't flash a banner during the first quick connect.
  useEffect(() => {
    if (connection === 'connected') {
      setShow(false);
      return undefined;
    }
    const t = setTimeout(() => setShow(true), connection === 'reconnecting' ? 0 : 2500);
    return () => clearTimeout(t);
  }, [connection]);
  if (!show) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900" role="status">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-amber-800" aria-hidden="true" />
      {connection === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
    </div>
  );
}

export default function ChatApp() {
  const engine = useChatEngine();
  const { state, actions } = engine;
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  usePrivacyHead();

  const active = state.conversations.find((c) => c._id === state.activeId);

  return (
    <ChatStoreContext.Provider value={engine}>
      <div
        className="fixed inset-0 flex flex-col bg-white"
        style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <ConnectionBanner connection={state.connection} />
        <div className="flex min-h-0 flex-1">
          {/* Phones show one pane at a time; desktop shows both. */}
          <aside className={`${active ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-gray-100 md:w-[340px] lg:w-[380px]`} aria-label="Conversations">
            <ConversationList onNewChat={() => setNewChatOpen(true)} onSettings={() => setSettingsOpen(true)} />
          </aside>
          <section className={`${active ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`} aria-label="Conversation">
            {active ? (
              <ChatWindow key={active._id} conversation={active} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center bg-[#f4f1f7] p-8 text-center">
                <p className="text-lg font-semibold text-gray-700">Select a conversation</p>
                <p className="mt-1 text-sm text-gray-500">or start a new one</p>
                <button type="button" onClick={() => setNewChatOpen(true)} className="btn-primary mt-4 py-2 text-sm">New chat</button>
              </div>
            )}
          </section>
        </div>
      </div>

      <NewChatPanel open={newChatOpen} onClose={() => setNewChatOpen(false)} onStart={actions.startChatWith} presence={state.presence} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ChatStoreContext.Provider>
  );
}
