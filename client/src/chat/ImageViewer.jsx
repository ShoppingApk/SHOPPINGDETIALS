import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

// Full-screen image viewer. Click the backdrop, the X, or press Escape to close.
export default function ImageViewer({ url, onClose }) {
  useEffect(() => {
    if (!url) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  if (!url) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-fade-in" role="dialog" aria-modal="true" aria-label="Image" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close image" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <CloseIcon />
      </button>
      <img src={url} alt="Shared" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}
