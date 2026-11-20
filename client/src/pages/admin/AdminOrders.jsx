import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { ChevronDownIcon } from '../../components/Icons';
import { adminApi } from '../../api/admin';
import { errMsg } from '../../api/client';
import useFetch from '../../hooks/useFetch';
import { formatDateTime, formatPrice, orderNo } from '../../utils/format';

// Same rules as the server: placed → shipped → delivered; cancel any time before delivery.
const NEXT = { placed: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: [], cancelled: [] };
const LABEL = { shipped: 'Mark shipped', delivered: 'Mark delivered', cancelled: 'Cancel order' };
const STATUSES = ['placed', 'shipped', 'delivered', 'cancelled'];

function OrderRow({ order, onChange, busy }) {
  const [open, setOpen] = useState(false);
  const o = order;
  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDownIcon width={16} height={16} className={`shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{orderNo(o._id)} · {o.user?.name || 'Deleted user'}</span>
            <span className="block truncate text-xs text-gray-500">
              {formatDateTime(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {o.user?.email}
            </span>
          </span>
        </button>
        <span className="w-24 text-sm font-semibold">{formatPrice(o.totalAmount)}</span>
        <StatusBadge status={o.status} />
        <div className="flex gap-1">
          {NEXT[o.status].map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => onChange(o, s)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${s === 'cancelled' ? 'text-red-600 hover:bg-red-50' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
            >
              {LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-4 rounded-lg bg-gray-50 p-3 text-sm md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">Items</p>
            <ul className="space-y-1">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {it.title} <span className="text-gray-500">{[it.size && `· ${it.size}`, it.color && `· ${it.color}`, `× ${it.quantity}`].filter(Boolean).join(' ')}</span>
                  </span>
                  <span className="shrink-0">{formatPrice(it.price * it.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-gray-200 pt-1 text-gray-600"><span>Delivery</span><span>{o.shippingFee ? formatPrice(o.shippingFee) : 'Free'}</span></li>
            </ul>
          </div>
          <div>
            <p className="mb-1 font-semibold">Deliver to</p>
            <address className="not-italic text-gray-700">
              {o.address.fullName}, {o.address.phone}<br />
              {[o.address.line1, o.address.line2].filter(Boolean).join(', ')}<br />
              {o.address.city}, {o.address.state} – {o.address.pincode}
            </address>
            <p className="mt-2 text-xs text-gray-500">
              History: {(o.statusHistory || []).map((h) => `${h.status} (${formatDateTime(h.at)})`).join(' → ')}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AdminOrders() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const status = sp.get('status') || '';
  const list = useFetch((signal) => adminApi.orders({ page, status }, signal), [page, status]);
  const [pendingChange, setPendingChange] = useState(null); // { order, status }
  const [busy, setBusy] = useState(false);

  const apply = async (order, next) => {
    setBusy(true);
    try {
      const { order: updated } = await adminApi.setOrderStatus(order._id, next);
      list.setData((d) => ({ ...d, orders: d.orders.map((x) => (x._id === updated._id ? updated : x)) }));
      toast.success(`Order ${orderNo(order._id)} marked ${next}`);
      setPendingChange(null);
    } catch (err) {
      toast.error(errMsg(err));
      list.reload();
    } finally {
      setBusy(false);
    }
  };

  const onChange = (order, next) => (next === 'cancelled' ? setPendingChange({ order, status: next }) : apply(order, next));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {['', ...STATUSES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            aria-pressed={status === s}
            onClick={() => setSp(s ? { status: s } : {})}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${status === s ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-gray-300 text-gray-700 hover:border-brand-300'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !list.data.orders.length ? (
        <EmptyState emoji="🧾" title="No orders" message={status ? `No ${status} orders right now.` : 'Orders will appear here.'} />
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-500">{list.data.pagination.total} order{list.data.pagination.total === 1 ? '' : 's'}</p>
          <ul className={`card divide-y divide-gray-100 ${list.loading ? 'opacity-60' : ''}`}>
            {list.data.orders.map((o) => <OrderRow key={o._id} order={o} onChange={onChange} busy={busy} />)}
          </ul>
          <Pagination
            page={page}
            pages={list.data.pagination.pages}
            onChange={(p) => setSp({ ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })}
          />
        </>
      )}

      <ConfirmDialog
        open={!!pendingChange}
        title="Cancel this order?"
        message={pendingChange ? `Order ${orderNo(pendingChange.order._id)} will be cancelled and its stock returned. This can’t be undone.` : ''}
        confirmLabel="Cancel order"
        danger
        busy={busy}
        onConfirm={() => apply(pendingChange.order, pendingChange.status)}
        onClose={() => setPendingChange(null)}
      />
    </div>
  );
}
