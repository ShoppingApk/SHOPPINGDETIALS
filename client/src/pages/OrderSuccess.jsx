import { Link, useParams } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import { ErrorState } from '../components/EmptyState';
import { CheckIcon } from '../components/Icons';
import { ordersApi } from '../api/orders';
import useFetch from '../hooks/useFetch';
import { formatPrice, orderNo } from '../utils/format';

export default function OrderSuccess() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch((signal) => ordersApi.get(id, signal), [id]);

  if (loading) return <Skeleton className="mx-auto h-72 w-full max-w-md rounded-2xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const o = data.order;
  return (
    <div className="mx-auto max-w-md py-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-600 animate-pop" aria-hidden="true">
        <CheckIcon width={44} height={44} strokeWidth={2.5} />
      </div>
      <h1 className="mt-5 text-2xl font-bold">Order placed!</h1>
      <p className="mt-1 text-gray-600">Thank you, {o.address.fullName.split(' ')[0]}. Your order {orderNo(o._id)} has been confirmed.</p>

      <div className="card mt-6 space-y-2 p-4 text-left text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Amount to pay on delivery</span><span className="font-bold">{formatPrice(o.totalAmount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{o.items.reduce((s, i) => s + i.quantity, 0)}</span></div>
        <div className="flex justify-between gap-4"><span className="shrink-0 text-gray-500">Delivering to</span><span className="text-right">{o.address.city}, {o.address.pincode}</span></div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to={`/orders/${o._id}`} className="btn-outline flex-1">View order</Link>
        <Link to="/" className="btn-primary flex-1">Continue shopping</Link>
      </div>
    </div>
  );
}
