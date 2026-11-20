import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal';
import { PaperclipIcon, SendIcon, SmileIcon } from './icons';

const EmojiPicker = lazy(() => import('./EmojiPicker'));
const TYPING_IDLE_MS = 2500;

export default function MessageInput({ conversationId, maxLength, imagesEnabled, onSendText, onSendImage, onTyping }) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [preview, setPreview] = useState(null); // { file, url }
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const emojiRef = useRef(null);
  const typingOn = useRef(false);
  const idleTimer = useRef(null);

  // Reset when switching conversations.
  useEffect(() => {
    setText('');
    setEmojiOpen(false);
    return () => {
      if (typingOn.current) onTyping(conversationId, false);
      typingOn.current = false;
      clearTimeout(idleTimer.current);
    };
  }, [conversationId, onTyping]);

  // Auto-grow up to ~5 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [text]);

  useEffect(() => {
    if (!emojiOpen) return undefined;
    const close = (e) => {
      if (!emojiRef.current?.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [emojiOpen]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  const stopTyping = () => {
    clearTimeout(idleTimer.current);
    if (typingOn.current) {
      typingOn.current = false;
      onTyping(conversationId, false);
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    if (!typingOn.current && e.target.value.trim()) {
      typingOn.current = true;
      onTyping(conversationId, true);
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const send = () => {
    if (!text.trim()) return;
    onSendText(conversationId, text);
    setText('');
    stopTyping();
    taRef.current?.focus();
  };

  const onKeyDown = (e) => {
    // Enter sends, Shift+Enter adds a new line (ignored while an IME is composing).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const insertEmoji = (emoji) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, maxLength);
    setText(next);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPreview({ file, url: URL.createObjectURL(file) });
  };

  const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700';
  const nearLimit = text.length > maxLength - 200;

  return (
    <div className="border-t border-gray-200 bg-white px-2 py-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {nearLimit && <p className="px-3 pb-1 text-right text-xs text-gray-500">{text.length}/{maxLength}</p>}
      <div className="flex items-end gap-1">
        <div className="relative" ref={emojiRef}>
          <button type="button" className={iconBtn} onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji" aria-expanded={emojiOpen}>
            <SmileIcon />
          </button>
          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-20">
              <Suspense fallback={<div className="h-20 w-72 rounded-2xl bg-white shadow-xl" />}>
                <EmojiPicker onPick={insertEmoji} />
              </Suspense>
            </div>
          )}
        </div>
        {imagesEnabled && (
          <>
            <button type="button" className={iconBtn} onClick={() => fileRef.current?.click()} aria-label="Attach image">
              <PaperclipIcon />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
          </>
        )}
        <label className="sr-only" htmlFor="msg-input">Message</label>
        <textarea
          id="msg-input"
          ref={taRef}
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={stopTyping}
          maxLength={maxLength}
          placeholder="Message"
          className="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-[15px] leading-6 outline-none focus:border-brand-300 focus:bg-white"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-gray-300"
          aria-label="Send"
        >
          <SendIcon width={18} height={18} />
        </button>
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Send image"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => setPreview(null)}>Cancel</button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                onSendImage(conversationId, preview.file);
                setPreview(null);
              }}
            >
              Send
            </button>
          </div>
        }
      >
        {preview && <img src={preview.url} alt="Selected" className="mx-auto max-h-[50vh] rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}
