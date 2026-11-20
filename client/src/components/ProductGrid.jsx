import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './Skeleton';

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5';

// Shows products, followed by `skeletons` placeholder cards while more are loading.
export default function ProductGrid({ products = [], loading = false, skeletons = 10, className = '' }) {
  return (
    <div className={`${GRID} ${className}`} aria-busy={loading}>
      {products.map((p, i) => (
        <ProductCard key={p._id} product={p} eager={i < 4} />
      ))}
      {loading && Array.from({ length: skeletons }, (_, i) => <ProductCardSkeleton key={`sk-${i}`} />)}
    </div>
  );
}
