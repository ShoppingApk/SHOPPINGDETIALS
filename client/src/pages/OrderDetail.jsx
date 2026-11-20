import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import LazyImage from '../components/LazyImage';
import StatusBadge from '../components/StatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import PriceSummary from '../components/PriceSummary';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { ChevronLeftIcon } from '../components/Icons';
import { ordersApi } from '../api/orders';
import { errMsg } from '../api/client';
import useFetch from '../hooks/useFetch';
import { formatDate, formatPrice, orderNo } from '../utils/format';

export default function OrderDetail() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch((signal) => ordersApi.get(id, signal), [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-3xl rounded-xl" />;
  if (error) {
    return error.toLowerCase().includes('not found') ? (
      <EmptyState emoji="📦" title="Order not found" actionLabel="My orders" actionTo="/orders" />
    ) : (
      <ErrorState message={error} onRetry={reload} />
    );
  }

  const o = data.order;
  const mrpTotal = o.items.reduce((s, i) => s + (i.mrp || i.price) * i.quantity, 0);

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await ordersApi.cancel(o._id);
      setData(res);
      toast.success('Order cancelled');
      setConfirmOpen(false);
    } catch (err) {
      toast.error(errMsg(err, 'Could not cancel the order'));
      reload();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600">
        <ChevronLeftIcon width={16} height={16} /> All orders
      </Link>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-lg font-bold">Order {orderNo(o._id)}</h1>
          <p className="text-sm text-gray-500">Placed on {formatDate(o.createdAt)} · Cash on Delivery</p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4" aria-labelledby="track-title">
          <h2 id="track-title" className="mb-4 font-semibold">Order status</h2>
          <OrderTimeline status={o.status} history={o.statusHistory} />
          {o.status === 'placed' && (
            <button type="button" onClick={() => setConfirmOpen(true)} className="mt-5 w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
              Cancel order
            </button>
          )}
        </section>

        <section className="card p-4" aria-labelledby="ship-title">
          <h2 id="ship-title" className="mb-2 font-semibold">Delivery address</h2>
          <address className="text-sm not-italic text-gray-700">
            <span className="font-semibold">{o.address.fullName}</span>
            <br />
            {[o.address.line1, o.address.line2].filter(Boolean).join(', ')}
            <br />
            {o.address.city}, {o.address.state} – {o.address.pincode}
            <br />
            Mobile: {o.address.phone}
          </address>
        </section>
      </div>

      <section className="card p-4" aria-labelledby="oi-title">
        <h2 id="oi-title" className="mb-2 font-semibold">Items</h2>
        <ul className="divide-y divide-gray-100">
          {o.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <Link to={`/product/${it.product}`} className="w-14 shrink-0">
                <LazyImage src={it.image} alt={it.title} className="aspect-[3/4] w-full rounded-md" />
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <Link to={`/product/${it.product}`} className="line-clamp-2 hover:text-brand-600">{it.title}</Link>
                <p className="text-xs text-gray-500">{[it.size && `Size ${it.size}`, it.color, `Qty ${it.quantity}`].filter(Boolean).join(' · ')}</p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(it.price * it.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <PriceSummary
          title="Payment summary"
          mrpTotal={mrpTotal}
          discount={mrpTotal - o.itemsTotal}
          itemsTotal={o.itemsTotal}
          shippingFee={o.shippingFee}
          total={o.totalAmount}
        />
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => !cancelling && setConfirmOpen(false)}
        title="Cancel this order?"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => setConfirmOpen(false)} disabled={cancelling}>
              Keep order
            </button>
            <button type="button" className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">Order {orderNo(o._id)} ({formatPrice(o.totalAmount)}) will be cancelled. This can’t be undone.</p>
      </Modal>
    </div>
  );
}
