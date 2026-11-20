import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import FilterPanel from '../components/FilterPanel';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { CloseIcon, FilterIcon, SortIcon } from '../components/Icons';
import { productsApi } from '../api/products';
import useFetch from '../hooks/useFetch';
import { CATEGORIES, SORT_OPTIONS } from '../utils/constants';

const PAGE_SIZE = 20;
const SORTS = SORT_OPTIONS.map((s) => s.value);

// URL query <-> filter state. The URL is the single source of truth, so filtered pages
// can be shared, bookmarked and navigated with the back button.
function readFilters(sp) {
  const category = sp.get('category') || '';
  const sort = sp.get('sort') || 'relevance';
  return {
    q: sp.get('q') || '',
    category: CATEGORIES.some((c) => c.name === category) ? category : '',
    brand: (sp.get('brand') || '').split(',').filter(Boolean),
    size: sp.get('size') || '',
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    minRating: sp.get('minRating') || '',
    sort: SORTS.includes(sort) ? sort : 'relevance',
    page: Math.max(1, Number(sp.get('page')) || 1),
  };
}

function toParams(f) {
  const p = {};
  if (f.q) p.q = f.q;
  if (f.category) p.category = f.category;
  if (f.brand.length) p.brand = f.brand.join(',');
  if (f.size) p.size = f.size;
  if (f.minPrice !== '') p.minPrice = f.minPrice;
  if (f.maxPrice !== '') p.maxPrice = f.maxPrice;
  if (f.minRating) p.minRating = f.minRating;
  if (f.sort && f.sort !== 'relevance') p.sort = f.sort;
  if (f.page > 1) p.page = String(f.page);
  return p;
}

function activeChips(f) {
  const chips = [];
  if (f.category) chips.push({ key: 'category', label: f.category, patch: { category: '', brand: [], size: '' } });
  f.brand.forEach((b) => chips.push({ key: `brand-${b}`, label: b, patch: { brand: f.brand.filter((x) => x !== b) } }));
  if (f.size) chips.push({ key: 'size', label: `Size ${f.size}`, patch: { size: '' } });
  if (f.minPrice !== '' || f.maxPrice !== '') {
    const label = f.minPrice && f.maxPrice ? `₹${f.minPrice} – ₹${f.maxPrice}` : f.minPrice ? `₹${f.minPrice}+` : `Under ₹${f.maxPrice}`;
    chips.push({ key: 'price', label, patch: { minPrice: '', maxPrice: '' } });
  }
  if (f.minRating) chips.push({ key: 'rating', label: `${f.minRating}★ & above`, patch: { minRating: '' } });
  return chips;
}

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => readFilters(sp), [sp]);
  const queryKey = sp.toString();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  const { data, loading, error, reload } = useFetch(
    (signal) => productsApi.list({ ...toParams(filters), page: filters.page, limit: PAGE_SIZE }, signal),
    [queryKey]
  );
  const facets = useFetch((signal) => productsApi.filters(filters.category, signal), [filters.category]);

  // Any filter change resets to page 1.
  const apply = (patch) => setSp(toParams({ ...filters, ...patch, page: patch.page ?? 1 }));
  const clearAll = () => setSp(toParams({ ...readFilters(new URLSearchParams()), q: filters.q }));

  const chips = activeChips(filters);
  const total = data?.pagination.total ?? 0;
  const heading = filters.q ? `Results for “${filters.q}”` : filters.category || 'All products';

  const openDrawer = () => {
    setDraft(filters);
    setDrawerOpen(true);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold md:text-2xl">{heading}</h1>
          <p className="text-sm text-gray-500" aria-live="polite">
            {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} product${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <label className="hidden items-center gap-2 text-sm md:flex">
          <span className="text-gray-600">Sort by</span>
          <select value={filters.sort} onChange={(e) => apply({ sort: e.target.value })} className="input w-auto py-2 pr-8">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Phones: sort / filter bar */}
      <div className="sticky top-[6.6rem] z-20 -mx-4 mb-3 grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-200 bg-white md:hidden">
        <button type="button" onClick={() => setSortOpen(true)} className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium">
          <SortIcon width={18} height={18} /> Sort
        </button>
        <button type="button" onClick={openDrawer} className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium">
          <FilterIcon width={18} height={18} /> Filter
          {chips.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{chips.length}</span>}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => apply(c.patch)}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 hover:bg-brand-100"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label} <CloseIcon width={14} height={14} />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-sm font-medium text-gray-500 underline hover:text-gray-800">
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block" aria-label="Filters">
          <div className="card sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto px-4">
            <FilterPanel value={filters} onChange={(v) => apply(v)} facets={facets.data} facetsLoading={facets.loading} />
          </div>
        </aside>

        <section className="min-w-0 flex-1" aria-label="Products">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !loading && data?.products.length === 0 ? (
            <EmptyState
              emoji="🔍"
              title="No products found"
              message={chips.length ? 'Try removing some filters.' : 'Try a different search term.'}
              actionLabel={chips.length ? 'Clear filters' : 'Browse all products'}
              {...(chips.length ? { onAction: clearAll } : { actionTo: '/products' })}
            />
          ) : (
            <>
              <ProductGrid products={loading ? [] : data?.products} loading={loading} skeletons={8} className="lg:grid-cols-3 xl:grid-cols-4" />
              {!loading && data && (
                <Pagination page={filters.page} pages={data.pagination.pages} onChange={(page) => apply({ page })} />
              )}
            </>
          )}
        </section>
      </div>

      {/* Phones: filter drawer with draft state */}
      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        variant="sheet"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => setDraft({ ...readFilters(new URLSearchParams()), q: filters.q, sort: filters.sort })}>
              Clear
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                apply({ ...draft, page: 1 });
                setDrawerOpen(false);
              }}
            >
              Apply
            </button>
          </div>
        }
      >
        <FilterPanel value={draft} onChange={setDraft} facets={facets.data} facetsLoading={facets.loading} />
      </Modal>

      <Modal open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by" variant="sheet" size="sm">
        <div role="radiogroup" aria-label="Sort by" className="-mx-1">
          {SORT_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-3 text-sm hover:bg-gray-50">
              {o.label}
              <input
                type="radio"
                name="sort"
                className="h-4 w-4 accent-brand-600"
                checked={filters.sort === o.value}
                onChange={() => {
                  apply({ sort: o.value });
                  setSortOpen(false);
                }}
              />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
