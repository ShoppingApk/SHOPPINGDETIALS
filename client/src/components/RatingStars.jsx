import { useState } from 'react';
import { StarIcon } from './Icons';

const badgeColor = (r) => (r >= 4 ? 'bg-green-600' : r >= 3 ? 'bg-lime-600' : r >= 2 ? 'bg-amber-500' : 'bg-red-500');

// Display: compact badge ("4.2 ★ (1,234)") or a row of stars.
// Input: pass `onChange` to render an accessible 1-5 star picker.
export default function RatingStars({ value = 0, count, variant = 'badge', onChange, size = 16, className = '' }) {
  const [hover, setHover] = useState(0);

  if (onChange) {
    const shown = hover || value;
    return (
      <div className={`flex gap-1 ${className}`} role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`rounded p-0.5 transition ${n <= shown ? 'text-amber-400' : 'text-gray-300'} hover:scale-110`}
          >
            <StarIcon width={28} height={28} />
          </button>
        ))}
      </div>
    );
  }

  const label = `Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count.toLocaleString('en-IN')} reviews` : ''}`;

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={label} title={label}>
        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold text-white ${badgeColor(value)}`}>
          {value.toFixed(1)}
          <StarIcon width={11} height={11} />
        </span>
        {count !== undefined && <span className="text-xs text-gray-500">({count.toLocaleString('en-IN')})</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={label} title={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <StarIcon width={size} height={size} className="absolute inset-0 text-gray-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon width={size} height={size} className="text-amber-400" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
