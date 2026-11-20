import { formatPrice } from '../utils/format';

// Price breakdown used by the bag, checkout and order pages.
export default function PriceSummary({ mrpTotal, discount, shippingFee, total, count, freeShippingAbove, itemsTotal, title = 'Price details' }) {
  const remaining = freeShippingAbove ? freeShippingAbove - itemsTotal : 0;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
        {count !== undefined && ` (${count} item${count === 1 ? '' : 's'})`}
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt>Total MRP</dt><dd>{formatPrice(mrpTotal)}</dd></div>
        <div className="flex justify-between"><dt>Discount on MRP</dt><dd className="text-green-600">−{formatPrice(discount)}</dd></div>
        <div className="flex justify-between">
          <dt>Delivery fee</dt>
          <dd>{shippingFee === 0 ? <span className="font-medium text-green-600">FREE</span> : formatPrice(shippingFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-base font-bold">
          <dt>Total amount</dt><dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {discount > 0 && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">You save {formatPrice(discount)} on this order 🎉</p>
      )}
      {shippingFee > 0 && remaining > 0 && (
        <p className="mt-2 text-xs text-gray-500">Add items worth {formatPrice(remaining)} more for FREE delivery.</p>
      )}
    </section>
  );
}
