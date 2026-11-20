export default function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-10 ${className}`} role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}
