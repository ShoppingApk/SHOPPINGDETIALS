import { CheckIcon } from './Icons';
import { formatDateTime } from '../utils/format';

const FLOW = ['placed', 'shipped', 'delivered'];
const LABELS = { placed: 'Order placed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

// Vertical status timeline built from the order's statusHistory.
export default function OrderTimeline({ status, history = [] }) {
  const at = Object.fromEntries(history.map((h) => [h.status, h.at]));
  const steps = status === 'cancelled' ? [...history.map((h) => h.status).filter((s) => s !== 'cancelled'), 'cancelled'] : FLOW;
  const reached = status === 'cancelled' ? steps.length - 1 : FLOW.indexOf(status);

  return (
    <ol className="relative" aria-label="Order status">
      {steps.map((s, i) => {
        const done = i <= reached;
        const cancelled = s === 'cancelled';
        const isLast = i === steps.length - 1;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${i < reached ? 'bg-green-500' : 'bg-gray-200'}`} aria-hidden="true" />
            )}
            <span
              className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
                cancelled ? 'bg-red-500' : done ? 'bg-green-500' : 'border-2 border-gray-300 bg-white'
              }`}
              aria-hidden="true"
            >
              {done && (cancelled ? '✕' : <CheckIcon width={14} height={14} />)}
            </span>
            <div className="-mt-0.5">
              <p className={`text-sm font-semibold ${done ? (cancelled ? 'text-red-600' : 'text-gray-900') : 'text-gray-400'}`}>
                {LABELS[s]}
                <span className="sr-only">{done ? ' (completed)' : ' (pending)'}</span>
              </p>
              {at[s] && <p className="text-xs text-gray-500">{formatDateTime(at[s])}</p>}
              {!done && s === 'delivered' && <p className="text-xs text-gray-400">Usually within 5–7 days</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
