import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products';
import { isCancel } from '../api/client';
import useDebounce from '../hooks/useDebounce';
import useRecentSearches from '../hooks/useRecentSearches';
import { ClockIcon, CloseIcon, SearchIcon } from './Icons';

/**
 * Reusable search box with debounced product suggestions and recent searches.
 *
 * Props:
 * - onBeforeSearch(term): optional. Called when the user submits a search, before anything
 *   else happens. Return (or resolve) `false` to stop the default behaviour (saving the term
 *   to recent searches and opening /products?q=term). Lets other features hook into search
 *   without changing this component.
 * - placeholder, className, inputClassName, autoFocus, onSearched (called after navigation).
 */
export default function SearchBar({
  onBeforeSearch,
  onSearched,
  placeholder = 'Search for kurtis, sarees, earbuds…',
  className = '',
  inputClassName = '',
  autoFocus = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { recent, add, remove, clear } = useRecentSearches();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const debounced = useDebounce(q.trim(), 250);

  // Keep the box in sync with the current results page (?q=...).
  useEffect(() => {
    if (location.pathname === '/products') {
      setQ(new URLSearchParams(location.search).get('q') || '');
    } else {
      setQ('');
    }
    setOpen(false);
  }, [location.pathname, location.search]);

  // Debounced suggestions (top 5 matching products).
  useEffect(() => {
    if (debounced.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    productsApi
      .suggest(debounced, ctrl.signal)
      .then((list) => setSuggestions(list.slice(0, 5)))
      .catch((err) => {
        if (!isCancel(err)) setSuggestions([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [debounced]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const showRecent = q.trim().length < 2;
  const options = showRecent
    ? recent.map((term) => ({ type: 'recent', key: `r-${term}`, label: term, term }))
    : suggestions.map((p) => ({ type: 'product', key: p._id, label: p.title, id: p._id, category: p.category }));
  const dropdownVisible = open && (showRecent ? recent.length > 0 : loading || options.length > 0 || debounced.length >= 2);

  const finish = () => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onSearched?.();
  };

  const runSearch = async (raw) => {
    const term = raw.trim();
    if (!term || busy) return;
    if (onBeforeSearch) {
      setBusy(true);
      let proceed = true;
      try {
        proceed = (await onBeforeSearch(term)) !== false;
      } finally {
        setBusy(false);
      }
      if (!proceed) {
        setQ('');
        finish();
        return;
      }
    }
    add(term);
    navigate(`/products?q=${encodeURIComponent(term)}`);
    finish();
  };

  const choose = (opt) => {
    if (opt.type === 'recent') {
      setQ(opt.term);
      runSearch(opt.term);
    } else {
      navigate(`/product/${opt.id}`);
      finish();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
    } else if (e.key === 'Escape') {
      if (open) {
        setOpen(false);
        setActive(-1);
      }
    } else if (e.key === 'Enter' && open && active >= 0 && options[active]) {
      e.preventDefault();
      choose(options[active]);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(q);
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <SearchIcon width={20} height={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 && options[active] ? `${listId}-${active}` : undefined}
            className={`w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setActive(-1);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear search"
            >
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </label>
      </form>

      {dropdownVisible && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {showRecent && (
            <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent searches</span>
              <button type="button" onClick={clear} className="text-xs font-medium text-brand-600 hover:underline">
                Clear all
              </button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={showRecent ? 'Recent searches' : 'Suggestions'} className="max-h-80 overflow-y-auto py-1">
            {options.map((opt, i) => (
              <li
                key={opt.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} // keep input focus
                onClick={() => choose(opt)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? 'bg-brand-50' : ''}`}
              >
                {opt.type === 'recent' ? (
                  <ClockIcon width={16} height={16} className="shrink-0 text-gray-400" />
                ) : (
                  <SearchIcon width={16} height={16} className="shrink-0 text-gray-400" />
                )}
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {opt.type === 'product' && <span className="shrink-0 text-xs text-gray-400">in {opt.category}</span>}
                {opt.type === 'recent' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(opt.term);
                    }}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label={`Remove ${opt.term} from recent searches`}
                  >
                    <CloseIcon width={14} height={14} />
                  </button>
                )}
              </li>
            ))}
            {!showRecent && loading && !options.length && <li className="px-3 py-3 text-sm text-gray-500">Searching…</li>}
            {!showRecent && !loading && !options.length && (
              <li className="px-3 py-3 text-sm text-gray-500">No matching products. Press Enter to search anyway.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
