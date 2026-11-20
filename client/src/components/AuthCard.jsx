export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-md py-4 md:py-10">
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-plum-600 p-6 text-white">
        <p className="text-sm font-medium opacity-90">Flat 60% off on first order</p>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm opacity-90">{subtitle}</p>}
      </div>
      <div className="card p-5 md:p-6">{children}</div>
    </div>
  );
}
