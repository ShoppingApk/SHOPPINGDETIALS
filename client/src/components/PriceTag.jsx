import { formatPrice } from '../utils/format';

const SIZES = {
  sm: { price: 'text-base', mrp: 'text-xs', off: 'text-xs' },
  md: { price: 'text-lg', mrp: 'text-sm', off: 'text-sm' },
  lg: { price: 'text-2xl md:text-3xl', mrp: 'text-base', off: 'text-base' },
};

export default function PriceTag({ price, mrp, discountPercent, size = 'sm', className = '' }) {
  const s = SIZES[size];
  const off = discountPercent ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  return (
    <div className={`flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className={`font-bold text-gray-900 ${s.price}`}>{formatPrice(price)}</span>
      {mrp > price && (
        <>
          <span className={`text-gray-400 line-through ${s.mrp}`}>
            <span className="sr-only">MRP </span>
            {formatPrice(mrp)}
          </span>
          <span className={`font-semibold text-green-600 ${s.off}`}>{off}% off</span>
        </>
      )}
    </div>
  );
}
