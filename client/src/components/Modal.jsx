import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

// Accessible dialog. variant "center" (default) or "sheet" (slides up from the bottom on
// phones, centred on desktop). Closes on Escape and backdrop click; restores focus on close.
export default function Modal({ open, onClose, title, children, footer, variant = 'center', size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const lastFocus = useRef(null);
  // Keep the latest onClose without re-running the effect (inline handlers change every render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector('input, select, textarea, button:not([data-close]), [href]');
      (first || panelRef.current)?.focus();
    }, 20);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab' && panelRef.current) {
        // Keep focus inside the dialog.
        const nodes = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const width = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-2xl' }[size];
  const sheet = variant === 'sheet';

  return createPortal(
    <div className={`fixed inset-0 z-50 flex ${sheet ? 'items-end md:items-center' : 'items-center px-4'} justify-center`}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col bg-white shadow-xl outline-none ${width} ${
          sheet ? 'rounded-t-2xl animate-slide-up md:rounded-2xl' : 'max-w-lg rounded-2xl animate-fade-in'
        }`}
        style={sheet ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 id={titleId} className="text-base font-semibold">{title}</h2>
            <button type="button" data-close onClick={onClose} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-gray-100 px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
