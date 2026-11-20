import { Link, useSearchParams } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { ChevronRightIcon } from '../components/Icons';
import { ordersApi } from '../api/orders';
import useFetch from '../hooks/useFetch';
import { formatDate, formatPrice, orderNo } from '../utils/format';

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const { data, loading, error, reload } = useFetch((signal) => ordersApi.mine(page, signal), [page]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-bold md:text-2xl">My orders</h1>
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data.orders.length ? (
        <EmptyState emoji="📦" title="No orders yet" message="When you place an order, it will show up here." actionLabel="Start shopping" actionTo="/" />
      ) : (
        <>
          <ul className="space-y-3">
            {data.orders.map((o) => (
              <li key={o._id}>
                <Link to={`/orders/${o._id}`} className="card flex items-center gap-3 p-3 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                  <div className="flex -space-x-4">
                    {o.items.slice(0, 3).map((it, i) => (
                      <LazyImage key={i} src={it.image} alt="" className="aspect-[3/4] w-12 rounded-md ring-2 ring-white" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={o.status} />
                      <span className="text-xs text-gray-500">{formatDate(o.createdAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm">
                      {o.items[0].title}
                      {o.items.length > 1 && <span className="text-gray-500"> + {o.items.length - 1} more</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      Order {orderNo(o._id)} · <span className="font-semibold text-gray-800">{formatPrice(o.totalAmount)}</span>
                    </p>
                  </div>
                  <ChevronRightIcon width={18} height={18} className="shrink-0 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pagination.pages} onChange={(p) => setSp(p > 1 ? { page: String(p) } : {})} />
        </>
      )}
    </div>
  );
}
