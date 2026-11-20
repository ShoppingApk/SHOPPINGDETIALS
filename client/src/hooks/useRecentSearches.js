import { useCallback, useState } from 'react';

const KEY = 'kz_recent_searches';
const MAX = 6;

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: keep in memory only */
  }
};

// Recent search terms: kept in memory and mirrored to localStorage when available.
export default function useRecentSearches() {
  const [recent, setRecent] = useState(read);

  const update = useCallback((fn) => {
    setRecent((prev) => {
      const next = fn(prev);
      write(next);
      return next;
    });
  }, []);

  const add = useCallback(
    (term) => update((prev) => [term, ...prev.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX)),
    [update]
  );
  const remove = useCallback((term) => update((prev) => prev.filter((t) => t !== term)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  return { recent, add, remove, clear };
}
