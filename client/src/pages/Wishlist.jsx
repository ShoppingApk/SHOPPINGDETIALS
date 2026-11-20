import ProductGrid from '../components/ProductGrid';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
  const { products, loading, error, refresh } = useWishlist();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold md:text-2xl">
        My wishlist {products.length > 0 && <span className="text-base font-normal text-gray-500">({products.length})</span>}
      </h1>
      {error && !products.length ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : !loading && !products.length ? (
        <EmptyState emoji="💖" title="Your wishlist is empty" message="Tap the heart on any product to save it here." actionLabel="Explore products" actionTo="/products" />
      ) : (
        <>
          <ProductGrid products={products} loading={loading && !products.length} skeletons={5} />
          <p className="mt-4 text-center text-xs text-gray-500">Tap the heart again to remove an item. Open a product to choose a size and add it to your bag.</p>
        </>
      )}
    </div>
  );
}
