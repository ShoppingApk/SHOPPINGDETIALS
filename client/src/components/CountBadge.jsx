export default function CountBadge({ count, label }) {
  if (!count) return null;
  return (
    <span
      className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
