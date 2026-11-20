import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { wishlistApi } from '../api/wishlist';
import { errMsg } from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [ids, setIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(() => new Set()); // product ids being toggled

  const apply = useCallback((data) => {
    setProducts(data.products);
    setIds(new Set(data.ids.map(String)));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      apply(await wishlistApi.get());
    } catch (err) {
      setError(errMsg(err, 'Could not load your wishlist'));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    if (user) refresh();
    else {
      setProducts([]);
      setIds(new Set());
    }
  }, [user, refresh]);

  const toggle = useCallback(
    async (productId) => {
      const id = String(productId);
      if (pending.has(id)) return;
      setPending((p) => new Set(p).add(id));
      // Optimistic update so the heart responds instantly.
      const wasIn = ids.has(id);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasIn) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        const data = await wishlistApi.toggle(id);
        apply(data);
        toast.success(data.added ? 'Added to wishlist' : 'Removed from wishlist', { id: `wl-${id}` });
      } catch (err) {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasIn) next.add(id);
          else next.delete(id);
          return next;
        });
        toast.error(errMsg(err));
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(id);
          return next;
        });
      }
    },
    [ids, pending, apply]
  );

  const has = useCallback((productId) => ids.has(String(productId)), [ids]);

  const value = useMemo(
    () => ({ products, count: ids.size, has, toggle, loading, error, refresh }),
    [products, ids, has, toggle, loading, error, refresh]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
