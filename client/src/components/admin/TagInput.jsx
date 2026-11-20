import { useState } from 'react';
import { CloseIcon } from '../Icons';

// Type a value and press Enter or comma to add it as a chip. Backspace on empty removes the last.
export default function TagInput({ id, value, onChange, placeholder, max = 15, suggestions = [] }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 30));
    onChange(next);
    setDraft('');
  };

  return (
    <div>
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        {value.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-sm text-brand-700">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded-full hover:text-brand-900">
              <CloseIcon width={12} height={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-brand-300 hover:text-brand-600">
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
