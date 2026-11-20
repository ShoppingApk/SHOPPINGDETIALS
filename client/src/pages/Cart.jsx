import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import PriceTag from '../components/PriceTag';
import PriceSummary from '../components/PriceSummary';
import QuantityStepper from '../components/QuantityStepper';
import Skeleton from '../components/Skeleton';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { AlertIcon, TrashIcon } from '../components/Icons';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

function CartItem({ item, onQty, onRemove, busy }) {
  const p = item.product;
  return (
    <li className="card flex gap-3 p-3">
      <Link to={`/product/${p._id}`} className="w-20 shrink-0 sm:w-24">
        <LazyImage src={p.image} alt={p.title} className="aspect-[3/4] w-full rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1">
        {p.brand && <p className="text-xs font-semibold uppercase text-gray-500">{p.brand}</p>}
        <Link to={`/product/${p._id}`} className="line-clamp-2 text-sm text-gray-800 hover:text-brand-600">{p.title}</Link>
        <p className="mt-0.5 text-xs text-gray-500">
          {[item.size && `Size: ${item.size}`, item.color && `Colour: ${item.color}`].filter(Boolean).join(' · ')}
        </p>
        <PriceTag price={p.price} mrp={p.mrp} discountPercent={p.discountPercent} className="mt-1" />
        {!item.inStock && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertIcon width={14} height={14} /> Only {p.stock} in stock. Reduce the quantity.
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper value={item.quantity} onChange={(q) => onQty(item, q)} max={Math.min(10, Math.max(p.stock, 1))} disabled={busy} size="sm" />
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remove ${p.title} from bag`}
          >
            <TrashIcon width={16} height={16} /> <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export default function Cart() {
  const { items, summary, loading, error, refresh, update, remove } = useCart();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  const withBusy = async (item, fn) => {
    setBusyId(item._id);
    await fn();
    setBusyId(null);
  };

  if (loading && !items.length) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }
  if (error && !items.length) return <ErrorState message={error} onRetry={refresh} />;
  if (!items.length) {
    return <EmptyState emoji="🛍️" title="Your bag is empty" message="Looks like you haven’t added anything yet." actionLabel="Start shopping" actionTo="/" />;
  }

  const blocked = items.some((i) => !i.inStock);

  return (
    <div className="pb-24 md:pb-0">
      <h1 className="mb-4 text-xl font-bold md:text-2xl">
        My bag <span className="text-base font-normal text-gray-500">({summary.count} item{summary.count === 1 ? '' : 's'})</span>
      </h1>
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <CartItem
              key={item._id}
              item={item}
              busy={busyId === item._id}
              onQty={(it, q) => withBusy(it, () => update(it._id, q))}
              onRemove={(it) => withBusy(it, () => remove(it._id))}
            />
          ))}
        </ul>

        <aside id="price-details" className="card h-fit scroll-mt-32 p-4 md:sticky md:top-32">
          <PriceSummary {...summary} />
          {blocked && <p className="mt-3 text-sm text-red-600" role="alert">Some items exceed available stock. Update them to continue.</p>}
          <button type="button" className="btn-primary mt-4 hidden w-full py-3 md:flex" disabled={blocked} onClick={() => navigate('/checkout')}>
            Place order
          </button>
        </aside>
      </div>

      {/* Phones: total + checkout above the bottom nav */}
      <div className="fixed inset-x-0 z-20 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-2.5 md:hidden" style={{ bottom: 'calc(3.55rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex-1">
          <p className="text-lg font-bold leading-tight">{formatPrice(summary.total)}</p>
          <a href="#price-details" className="text-xs font-medium text-brand-600">View price details</a>
        </div>
        <button type="button" className="btn-primary flex-1 py-3" disabled={blocked} onClick={() => navigate('/checkout')}>
          Place order
        </button>
      </div>
    </div>
  );
}
