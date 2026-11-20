import { Link } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import { ErrorState } from '../components/EmptyState';
import { ChevronRightIcon } from '../components/Icons';
import { productsApi } from '../api/products';
import useFetch from '../hooks/useFetch';
import { CATEGORIES } from '../utils/constants';

export default function Categories() {
  const { data, loading, error, reload } = useFetch(() => productsApi.categories(), []);
  const counts = Object.fromEntries((data?.categories || []).map((c) => [c.name, c.count]));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold md:text-2xl">Shop by category</h1>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map(({ name, emoji, tint }) => (
            <li key={name}>
              <Link
                to={`/products?category=${encodeURIComponent(name)}`}
                className={`flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${tint}`}
              >
                <span className="text-4xl" aria-hidden="true">{emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900">{name}</span>
                  {loading ? <Skeleton className="mt-1 h-3 w-16" /> : <span className="text-xs text-gray-600">{counts[name] ?? 0} products</span>}
                </span>
                <ChevronRightIcon width={18} height={18} className="text-gray-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/products" className="btn-outline mt-6 w-full sm:w-auto">Browse all products</Link>
    </div>
  );
}
