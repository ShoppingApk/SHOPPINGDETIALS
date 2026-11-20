import { Fragment, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { dayLabel, sameDay } from './time';

const NEAR_BOTTOM_PX = 120;

export default function MessageList({ conversationId, thread, me, typing, onLoadOlder, onMenu, onOpenImage, onRetry }) {
  const ref = useRef(null);
  const nearBottom = useRef(true);
  const prepend = useRef(null); // { height, top } captured before loading older messages
  const edges = useRef({ first: null, last: null, cid: null });
  const items = thread?.items || [];

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Keep the view anchored: stay put when older messages are prepended, follow new ones at the bottom.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = items[0]?._id ?? null;
    const lastMsg = items[items.length - 1];
    const last = lastMsg?._id ?? null;
    const prev = edges.current;

    if (prev.cid !== conversationId) {
      scrollToBottom();
    } else if (prepend.current && first !== prev.first) {
      el.scrollTop = el.scrollHeight - prepend.current.height + prepend.current.top;
      prepend.current = null;
    } else if (last !== prev.last && (nearBottom.current || String(lastMsg?.sender) === me)) {
      scrollToBottom();
    }
    edges.current = { first, last, cid: conversationId };
  }, [items, conversationId, me, scrollToBottom]);

  // Typing indicator appearing at the bottom: keep it visible.
  useEffect(() => {
    if (typing && nearBottom.current) scrollToBottom();
  }, [typing, scrollToBottom]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (el.scrollTop < 80 && thread?.hasMore && thread.status === 'ready') {
      prepend.current = { height: el.scrollHeight, top: el.scrollTop };
      onLoadOlder();
    }
  };

  const onImageLoad = useCallback(() => {
    if (nearBottom.current) scrollToBottom();
  }, [scrollToBottom]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f4f1f7] py-3"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Messages"
    >
      {thread?.status === 'loading-older' && <p className="py-2 text-center text-xs text-gray-500">Loading earlier messages…</p>}
      {thread && !thread.hasMore && items.length > 0 && (
        <p className="mx-auto mb-3 w-fit rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-800">🔒 Messages are encrypted when stored.</p>
      )}

      {(!thread || thread.status === 'loading') && !items.length && (
        <div className="space-y-3 px-3" aria-busy="true">
          {[40, 60, 30, 55].map((w, i) => (
            <div key={i} className={`flex ${i % 2 ? 'justify-end' : ''}`}>
              <span className="h-9 animate-pulse rounded-2xl bg-white/80" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {thread?.status === 'ready' && !items.length && (
        <p className="mx-auto mt-10 w-fit rounded-xl bg-white px-4 py-3 text-center text-sm text-gray-500 shadow-sm">Say hello 👋</p>
      )}

      {items.map((m, i) => {
        const showDay = i === 0 || !sameDay(items[i - 1].createdAt, m.createdAt);
        return (
          <Fragment key={m._id}>
            {showDay && (
              <div className="my-3 flex justify-center" role="separator">
                <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">{dayLabel(m.createdAt)}</span>
              </div>
            )}
            <MessageBubble
              msg={m}
              mine={String(m.sender) === me}
              me={me}
              onMenu={onMenu}
              onOpenImage={onOpenImage}
              onRetry={onRetry}
              onImageLoad={onImageLoad}
            />
          </Fragment>
        );
      })}

      {typing && (
        <div className="px-3 py-1" aria-label="typing">
          <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-sm">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
