import { Link } from 'react-router-dom';

// App logo (SVG mark + wordmark). Reused across the app.
// `onClick` lets callers attach extra behaviour without changing how it looks or navigates.
export default function Logo({ onClick, compact = false, className = '' }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`flex shrink-0 select-none items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
      aria-label="Kaasni home"
      draggable={false}
    >
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="kz-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e2337a" />
            <stop offset="1" stopColor="#7b3fa8" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#kz-logo-g)" />
        <path d="M22 16v32M22 33l18-17M27 29l15 19" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!compact && (
        <span className="bg-gradient-to-r from-brand-600 to-plum-600 bg-clip-text text-xl font-bold tracking-tight text-transparent">
          kaasni
        </span>
      )}
    </Link>
  );
}
