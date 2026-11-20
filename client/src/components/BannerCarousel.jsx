import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

const INTERVAL = 4500;

// Auto-sliding banner carousel. Pauses on hover/focus, supports swipe and arrow keys,
// and doesn't auto-play for users who prefer reduced motion.
export default function BannerCarousel({ banners }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = banners.length;

  const go = useCallback((i) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce || count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(t);
  }, [paused, count]);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
    setPaused(false);
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
    >
      <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={`relative w-full shrink-0 bg-gradient-to-r ${b.className} px-5 py-6 text-white md:px-12 md:py-12`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${b.title}`}
            aria-hidden={i !== index}
          >
            <div className="relative z-10 max-w-[70%] md:max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90 md:text-sm">{b.eyebrow}</p>
              <h2 className="mt-1 text-xl font-bold leading-tight md:text-4xl">{b.title}</h2>
              <p className="mt-1 text-sm opacity-90 md:mt-2 md:text-base">{b.text}</p>
              <Link
                to={b.to}
                tabIndex={i === index ? 0 : -1}
                className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-gray-100 md:mt-5"
              >
                {b.cta}
              </Link>
            </div>
            <span className="pointer-events-none absolute -right-2 bottom-0 text-[5.5rem] leading-none opacity-90 md:right-10 md:text-[10rem]" aria-hidden="true">
              {b.emoji}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-800 shadow hover:bg-white md:block"
        aria-label="Previous offer"
      >
        <ChevronLeftIcon width={20} height={20} />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-800 shadow hover:bg-white md:block"
        aria-label="Next offer"
      >
        <ChevronRightIcon width={20} height={20} />
      </button>

      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {banners.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show offer ${i + 1}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
          />
        ))}
      </div>
    </section>
  );
}
