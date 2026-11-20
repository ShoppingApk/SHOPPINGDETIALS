import { useCallback, useEffect, useRef, useState } from 'react';
import BannerCarousel from '../components/BannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ProductRail from '../components/ProductRail';
import ProductGrid from '../components/ProductGrid';
import { ErrorState } from '../components/EmptyState';
import { productsApi } from '../api/products';
import { errMsg, isCancel } from '../api/client';
import useFetch from '../hooks/useFetch';
import useInView from '../hooks/useInView';
import { BANNERS } from '../utils/constants';

const PAGE_SIZE = 20;

// "Just for you" feed: infinite scroll with a Load more fallback.
function useProductFeed() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);
  const ctrlRef = useRef(null);

  const loadNext = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const next = page + 1;
      const data = await productsApi.list({ page: next, limit: PAGE_SIZE, sort: 'newest' }, ctrl.signal);
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...data.products.filter((p) => !seen.has(p._id))];
      });
      setPage(next);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      if (!isCancel(err)) setError(errMsg(err, 'Could not load products'));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, hasMore]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  return { products, loading, error, hasMore, loadNext };
}

export default function Home() {
  const trending = useFetch((signal) => productsApi.list({ sort: 'rating', limit: 10 }, signal), []);
  const deals = useFetch((signal) => productsApi.list({ sort: 'discount', limit: 10 }, signal), []);
  const feed = useProductFeed();
  const [sentinelRef, sentinelVisible] = useInView({ rootMargin: '600px' });

  // First page on mount, then auto-load whenever the sentinel scrolls into view.
  const { loadNext, loading, hasMore, error, products } = feed;
  useEffect(() => {
    if ((products.length === 0 || sentinelVisible) && !loading && hasMore && !error) loadNext();
  }, [sentinelVisible, products.length, loading, hasMore, error, loadNext]);

  return (
    <div className="space-y-6 md:space-y-8">
      <BannerCarousel banners={BANNERS} />

      <CategoryChips />

      <ProductRail
        title="Trending now"
        subtitle="Top-rated by shoppers like you"
        products={trending.data?.products}
        loading={trending.loading}
        error={trending.error}
        viewAllTo="/products?sort=rating"
      />

      <ProductRail
        title="Deals of the day"
        subtitle="Biggest discounts, today only"
        products={deals.data?.products}
        loading={deals.loading}
        error={deals.error}
        viewAllTo="/products?sort=discount"
        accent="from-amber-50 to-white"
      />

      <section aria-labelledby="feed-title">
        <h2 id="feed-title" className="mb-3 text-lg font-bold md:text-xl">Just for you</h2>
        {error && products.length === 0 ? (
          <ErrorState message={error} onRetry={loadNext} />
        ) : (
          <ProductGrid products={products} loading={loading} skeletons={products.length ? 5 : 10} />
        )}

        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
          {error && products.length > 0 && <p className="text-sm text-red-600" role="alert">{error}</p>}
          {hasMore && products.length > 0 && !loading && (
            <button type="button" onClick={loadNext} className="btn-outline">
              Load more
            </button>
          )}
          {!hasMore && products.length > 0 && <p className="text-sm text-gray-400">You’ve seen it all 🎉</p>}
        </div>
      </section>
    </div>
  );
}
