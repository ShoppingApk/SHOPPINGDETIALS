const STYLES = {
  placed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-amber-50 text-amber-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
