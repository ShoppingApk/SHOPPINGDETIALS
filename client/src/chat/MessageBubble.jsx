import { memo, useRef } from 'react';
import Ticks from './Ticks';
import { timeOf } from './time';

const LONG_PRESS_MS = 500;

// One message. Right-click (desktop), long-press (touch) or the context-menu key opens actions.
function MessageBubble({ msg, mine, onMenu, onOpenImage, onRetry, onImageLoad }) {
  const pressTimer = useRef(null);
  const startPress = () => {
    pressTimer.current = setTimeout(() => onMenu(msg), LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const failed = msg.status === 'failed';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} px-3 py-0.5`}>
      <div
        tabIndex={0}
        role="group"
        aria-label={`${mine ? 'You' : 'Them'} at ${timeOf(msg.createdAt)}${msg.deleted ? ', deleted message' : ''}`}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(msg);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            e.preventDefault();
            onMenu(msg);
          }
        }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        className={`relative max-w-[80%] select-text rounded-2xl px-3 py-1.5 text-[15px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:max-w-[65%] ${
          mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-gray-900'
        } ${msg.status === 'sending' ? 'opacity-80' : ''}`}
        style={{ WebkitTouchCallout: 'none' }}
      >
        {msg.deleted ? (
          <p className={`italic ${mine ? 'text-white/80' : 'text-gray-400'}`}>🚫 {msg.text || 'This message was deleted'}</p>
        ) : (
          <>
            {msg.imageUrl && (
              <button type="button" onClick={() => onOpenImage(msg.imageUrl)} className="-mx-1.5 -mt-0.5 mb-1 block overflow-hidden rounded-xl" aria-label="Open image">
                <img src={msg.imageUrl} alt="Shared" onLoad={onImageLoad} className="max-h-72 w-full min-w-[10rem] object-cover" draggable={false} />
              </button>
            )}
            {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
          </>
        )}
        <span className={`float-right ml-2 mt-1 flex items-center gap-1 text-[11px] leading-none ${mine ? 'text-white/75' : 'text-gray-400'}`}>
          {timeOf(msg.createdAt)}
          {mine && !msg.deleted && <Ticks status={msg.status} light />}
        </span>
        {failed && (
          <button type="button" onClick={() => onRetry(msg)} className="clear-both mt-1 block text-xs font-semibold text-red-100 underline">
            {msg.error ? `${msg.error}. ` : ''}Tap to retry
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
