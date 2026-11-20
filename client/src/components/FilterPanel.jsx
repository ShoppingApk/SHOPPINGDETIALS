import { useEffect, useState } from 'react';
import { CATEGORIES, PRICE_RANGES } from '../utils/constants';
import Skeleton from './Skeleton';

// A labelled group (a <fieldset>/<legend> renders the title on the border, breaking the spacing).
function Section({ title, children }) {
  const id = `fp-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div role="group" aria-labelledby={id} className="border-b border-gray-100 py-4 last:border-0">
      <h3 id={id} className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

const chip = (on) =>
  `rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-gray-300 text-gray-700 hover:border-brand-300'}`;

// Controlled filter form. `value` = { category, brand: string[], size, minPrice, maxPrice, minRating }.
// Used live in the desktop sidebar and with a draft + Apply button in the mobile drawer.
export default function FilterPanel({ value, onChange, facets, facetsLoading }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const [min, setMin] = useState(value.minPrice);
  const [max, setMax] = useState(value.maxPrice);

  useEffect(() => {
    setMin(value.minPrice);
    setMax(value.maxPrice);
  }, [value.minPrice, value.maxPrice]);

  const applyCustomPrice = (e) => {
    e.preventDefault();
    let lo = min === '' ? '' : String(Math.max(0, Number(min) || 0));
    let hi = max === '' ? '' : String(Math.max(0, Number(max) || 0));
    if (lo !== '' && hi !== '' && Number(lo) > Number(hi)) [lo, hi] = [hi, lo];
    set({ minPrice: lo, maxPrice: hi });
  };

  const toggleBrand = (b) =>
    set({ brand: value.brand.includes(b) ? value.brand.filter((x) => x !== b) : [...value.brand, b] });

  return (
    <div>
      <Section title="Category">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!value.category)} aria-pressed={!value.category} onClick={() => set({ category: '', brand: [], size: '' })}>
            All
          </button>
          {CATEGORIES.map(({ name }) => (
            <button
              key={name}
              type="button"
              className={chip(value.category === name)}
              aria-pressed={value.category === name}
              onClick={() => set({ category: value.category === name ? '' : name, brand: [], size: '' })}
            >
              {name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price">
        <div className="space-y-1.5">
          {PRICE_RANGES.map((r) => {
            const on = value.minPrice === r.min && value.maxPrice === r.max;
            return (
              <label key={r.label} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="price-range"
                  className="h-4 w-4 accent-brand-600"
                  checked={on}
                  onChange={() => set({ minPrice: r.min, maxPrice: r.max })}
                />
                {r.label}
              </label>
            );
          })}
        </div>
        <form onSubmit={applyCustomPrice} className="mt-3 flex items-center gap-2">
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" type="number" inputMode="numeric" min="0" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="input w-0 flex-1 py-1.5" />
          <span className="text-gray-400" aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" type="number" inputMode="numeric" min="0" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="input w-0 flex-1 py-1.5" />
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">Go</button>
        </form>
        {facets?.priceRange?.max > 0 && (
          <p className="mt-1.5 text-xs text-gray-400">Prices range ₹{facets.priceRange.min} – ₹{facets.priceRange.max}</p>
        )}
      </Section>

      <Section title="Brand">
        {facetsLoading ? (
          <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
        ) : facets?.brands?.length ? (
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <label key={b} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" checked={value.brand.includes(b)} onChange={() => toggleBrand(b)} />
                {b}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No brands</p>
        )}
      </Section>

      {(facetsLoading || facets?.sizes?.length > 0) && (
        <Section title="Size">
          <div className="flex flex-wrap gap-2">
            {facetsLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              facets.sizes.map((s) => (
                <button key={s} type="button" className={chip(value.size === s)} aria-pressed={value.size === s} onClick={() => set({ size: value.size === s ? '' : s })}>
                  {s}
                </button>
              ))
            )}
          </div>
        </Section>
      )}

      <Section title="Customer rating">
        <div className="space-y-1.5">
          {['4', '3'].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand-600"
                checked={value.minRating === r}
                onChange={() => set({ minRating: value.minRating === r ? '' : r })}
              />
              {r}★ &amp; above
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
