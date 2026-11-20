import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './Skeleton';
import { ChevronRightIcon } from './Icons';

// Horizontally scrolling product section ("Trending", "Deals of the day", "Similar products").
export default function ProductRail({ title, subtitle, products = [], loading, error, viewAllTo, accent = 'from-brand-50 to-white' }) {
  if (!loading && !error && !products.length) return null;
  return (
    <section className={`rounded-2xl bg-gradient-to-b ${accent} p-3 md:p-4`} aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 md:text-xl">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 md:text-sm">{subtitle}</p>}
        </div>
        {viewAllTo && (
          <Link to={viewAllTo} className="flex items-center text-sm font-semibold text-brand-600 hover:underline">
            View all <ChevronRightIcon width={16} height={16} />
          </Link>
        )}
      </div>
      {error ? (
        <p className="py-6 text-center text-sm text-gray-500">{error}</p>
      ) : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {(loading ? Array.from({ length: 6 }) : products).map((p, i) => (
            <div key={p?._id || i} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[18%]">
              {loading ? <ProductCardSkeleton /> : <ProductCard product={p} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
