import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

// Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20
function pageList(page, pages) {
  const out = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...out].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const withGaps = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) withGaps.push(`gap-${p}`);
    withGaps.push(p);
  });
  return withGaps;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const base = 'grid h-9 min-w-[2.25rem] place-items-center rounded-lg px-2 text-sm font-medium transition';
  return (
    <nav className="flex items-center justify-center gap-1.5 py-6" aria-label="Pagination">
      <button type="button" className={`${base} border border-gray-300 hover:bg-gray-50 disabled:opacity-40`} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeftIcon width={18} height={18} />
      </button>
      {pageList(page, pages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="px-1 text-gray-400" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`${base} ${p === page ? 'bg-brand-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className={`${base} border border-gray-300 hover:bg-gray-50 disabled:opacity-40`} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
        <ChevronRightIcon width={18} height={18} />
      </button>
    </nav>
  );
}
