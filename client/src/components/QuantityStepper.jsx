import { MinusIcon, PlusIcon } from './Icons';

export default function QuantityStepper({ value, onChange, min = 1, max = 10, disabled = false, label = 'Quantity', size = 'md' }) {
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-l-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40`}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-semibold" aria-live="polite" aria-label={`${label}: ${value}`}>
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-r-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40`}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}
