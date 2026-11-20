import { useRef, useState } from 'react';
import LazyImage from './LazyImage';

// Main image + thumbnails. Swipe on phones, click/arrow keys on thumbnails.
export default function ImageGallery({ images = [], title }) {
  const [active, setActive] = useState(0);
  const touchX = useRef(null);
  const list = images.length ? images : [{ url: '' }];
  const go = (i) => setActive((i + list.length) % list.length);

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto md:w-20 md:flex-col" role="tablist" aria-label="Product images">
          {list.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Image ${i + 1} of ${list.length}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(active + 1);
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(active - 1);
              }}
              className={`w-16 shrink-0 overflow-hidden rounded-lg border-2 transition md:w-full ${i === active ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <LazyImage src={img.url} alt="" className="aspect-[3/4] w-full" />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative flex-1 overflow-hidden rounded-2xl bg-gray-100"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <LazyImage key={list[active].url} src={list[active].url} alt={`${title}, image ${active + 1} of ${list.length}`} eager className="aspect-[3/4] w-full" />
        {list.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white md:hidden" aria-hidden="true">
            {active + 1}/{list.length}
          </span>
        )}
      </div>
    </div>
  );
}
