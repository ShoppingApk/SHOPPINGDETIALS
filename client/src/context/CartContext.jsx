import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { cartApi } from '../api/cart';
import { errMsg } from '../api/client';
import { useAuth } from './AuthContext';

const EMPTY_SUMMARY = { count: 0, mrpTotal: 0, discount: 0, itemsTotal: 0, shippingFee: 0, total: 0, freeShippingAbove: 499 };

const CartContext = createContext(null);

// Bag state synced with the backend. Each mutation returns the full bag from the server.
export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apply = useCallback((data) => {
    setItems(data.items);
    setSummary(data.summary);
    if (data.removedUnavailable) toast(`${data.removedUnavailable} unavailable item(s) were removed from your bag`);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      apply(await cartApi.get());
    } catch (err) {
      setError(errMsg(err, 'Could not load your bag'));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  // Load on login, reset on logout.
  useEffect(() => {
    if (user) refresh();
    else {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
    }
  }, [user, refresh]);

  // Wraps a mutation with error toasts. Returns the bag data or null on failure.
  const run = useCallback(
    async (fn, successMsg) => {
      try {
        const data = apply(await fn());
        if (successMsg) toast.success(successMsg);
        return data;
      } catch (err) {
        toast.error(errMsg(err));
        return null;
      }
    },
    [apply]
  );

  const add = useCallback((item) => run(() => cartApi.add(item), 'Added to bag'), [run]);
  const update = useCallback((itemId, quantity) => run(() => cartApi.update(itemId, quantity)), [run]);
  const remove = useCallback((itemId) => run(() => cartApi.remove(itemId), 'Removed from bag'), [run]);
  const clear = useCallback(() => run(() => cartApi.clear()), [run]);
  // After an order the server empties the bag; mirror that locally without a request.
  const resetLocal = useCallback(() => {
    setItems([]);
    setSummary(EMPTY_SUMMARY);
  }, []);

  const value = useMemo(
    () => ({ items, summary, count: summary.count, loading, error, refresh, add, update, remove, clear, resetLocal }),
    [items, summary, loading, error, refresh, add, update, remove, clear, resetLocal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
