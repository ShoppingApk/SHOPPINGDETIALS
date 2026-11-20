import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-7xl font-bold text-brand-200" aria-hidden="true">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-gray-500">The page you are looking for doesn’t exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn-primary">Go to home</Link>
        <Link to="/products" className="btn-outline">Browse products</Link>
      </div>
    </div>
  );
}
