import { Link } from 'react-router-dom';
import Skeleton from '../../components/Skeleton';
import { ErrorState } from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import LazyImage from '../../components/LazyImage';
import { adminApi } from '../../api/admin';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatPrice, orderNo, firstImage } from '../../utils/format';

function Stat({ label, value, hint, to }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-4 transition hover:shadow-md">{body}</Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch((signal) => adminApi.stats(signal), []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { users, products, orders, revenue, recentOrders } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue (COD)" value={formatPrice(revenue)} hint="Excludes cancelled orders" />
        <Stat label="Orders" value={orders.total} hint={`${orders.placed} to ship · ${orders.shipped} in transit`} to="/admin/orders" />
        <Stat label="Products" value={products.total} hint={`${products.inactive} hidden · ${products.lowStock.length} low on stock`} to="/admin/products" />
        <Stat label="Users" value={users.user + users.chatuser + users.admin} hint={`${users.user} shoppers · ${users.chatuser} special`} to="/admin/users" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="card p-4" aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-title" className="font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentOrders.map((o) => (
                <li key={o._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{orderNo(o._id)} · {o.user?.name || 'Deleted user'}</p>
                    <p className="text-xs text-gray-500">{formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">{formatPrice(o.totalAmount)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4" aria-labelledby="low-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="low-title" className="font-semibold">Low stock</h2>
            <Link to="/admin/products?lowStock=1" className="text-sm font-medium text-brand-600 hover:underline">Manage</Link>
          </div>
          {products.lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">All products have 10+ in stock.</p>
          ) : (
            <ul className="space-y-2">
              {products.lowStock.map((p) => (
                <li key={p._id} className="flex items-center gap-3 text-sm">
                  <LazyImage src={firstImage(p)} alt="" className="aspect-[3/4] w-9 shrink-0 rounded" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className={`shrink-0 font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
