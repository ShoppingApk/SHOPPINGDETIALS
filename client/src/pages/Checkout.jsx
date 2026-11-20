import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AddressForm, { EMPTY_ADDRESS, validateAddress } from '../components/AddressForm';
import PriceSummary from '../components/PriceSummary';
import LazyImage from '../components/LazyImage';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { CashIcon, MapPinIcon, PlusIcon } from '../components/Icons';
import { addressApi, ordersApi } from '../api/orders';
import { errMsg, fieldErrors } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

export default function Checkout() {
  const navigate = useNavigate();
  const cart = useCart();
  const saved = useFetch(() => addressApi.list(), []);
  const addresses = saved.data?.addresses || [];

  const [selectedId, setSelectedId] = useState('');
  const [useNew, setUseNew] = useState(false);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);

  // Pick the default saved address, or show the form when there are none.
  useEffect(() => {
    if (saved.loading) return;
    const list = saved.data?.addresses || [];
    if (list.length) {
      setSelectedId((id) => id || (list.find((a) => a.isDefault) || list[0])._id);
    } else {
      setUseNew(true);
    }
  }, [saved.loading, saved.data]);

  if (cart.loading && !cart.items.length) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!cart.items.length && !placing) {
    return <EmptyState emoji="🛍️" title="Your bag is empty" message="Add something to your bag before checking out." actionLabel="Start shopping" actionTo="/" />;
  }

  const blocked = cart.items.some((i) => !i.inStock);

  const placeOrder = async () => {
    let body;
    if (useNew || !addresses.length) {
      const errs = validateAddress(address);
      setErrors(errs);
      if (Object.keys(errs).length) {
        toast.error('Please fix the highlighted address fields');
        document.getElementById(`addr-${Object.keys(errs)[0]}`)?.focus();
        return;
      }
      body = { address: Object.fromEntries(Object.entries(address).map(([k, v]) => [k, v.trim()])), saveAddress };
    } else {
      body = { addressId: selectedId };
    }

    setPlacing(true);
    try {
      const { order } = await ordersApi.place(body);
      cart.resetLocal();
      toast.success('Order placed!');
      navigate(`/order-success/${order._id}`, { replace: true });
    } catch (err) {
      setPlacing(false);
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      toast.error(errMsg(err, 'Could not place your order'));
      if (err.response?.status === 409) cart.refresh(); // stock changed
    }
  };

  return (
    <div className="pb-24 md:pb-0">
      <h1 className="mb-4 text-xl font-bold md:text-2xl">Checkout</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-4" aria-labelledby="addr-title">
            <h2 id="addr-title" className="mb-3 flex items-center gap-2 font-semibold">
              <MapPinIcon width={18} height={18} className="text-brand-600" /> Delivery address
            </h2>

            {saved.loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                {addresses.length > 0 && (
                  <div role="radiogroup" aria-label="Saved addresses" className="space-y-2">
                    {addresses.map((a) => (
                      <label
                        key={a._id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${!useNew && selectedId === a._id ? 'border-brand-500 bg-brand-50/50' : 'border-gray-200 hover:border-brand-200'}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          className="mt-1 h-4 w-4 accent-brand-600"
                          checked={!useNew && selectedId === a._id}
                          onChange={() => {
                            setSelectedId(a._id);
                            setUseNew(false);
                          }}
                        />
                        <span>
                          <span className="font-semibold">{a.fullName}</span>
                          {a.isDefault && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">Default</span>}
                          <span className="block text-gray-600">
                            {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(', ')} – {a.pincode}
                          </span>
                          <span className="block text-gray-600">Mobile: {a.phone}</span>
                        </span>
                      </label>
                    ))}
                    {!useNew && (
                      <button type="button" onClick={() => setUseNew(true)} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                        <PlusIcon width={16} height={16} /> Add a new address
                      </button>
                    )}
                  </div>
                )}

                {(useNew || !addresses.length) && (
                  <div className={addresses.length ? 'mt-4 border-t border-gray-100 pt-4' : ''}>
                    {addresses.length > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">New address</p>
                        <button type="button" onClick={() => { setUseNew(false); setErrors({}); }} className="text-sm text-gray-500 hover:underline">
                          Use a saved address
                        </button>
                      </div>
                    )}
                    <AddressForm value={address} onChange={setAddress} errors={errors} />
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      Save this address for next time
                    </label>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card p-4" aria-labelledby="pay-title">
            <h2 id="pay-title" className="mb-3 flex items-center gap-2 font-semibold">
              <CashIcon width={18} height={18} className="text-brand-600" /> Payment method
            </h2>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-500 bg-brand-50/50 p-3 text-sm">
              <input type="radio" name="payment" className="h-4 w-4 accent-brand-600" checked readOnly />
              <span>
                <span className="font-semibold">Cash on Delivery</span>
                <span className="block text-gray-600">Pay in cash or UPI when your order arrives.</span>
              </span>
            </label>
            <p className="mt-2 text-xs text-gray-400">Online payments are not available in this demo store.</p>
          </section>

          <section className="card p-4" aria-labelledby="items-title">
            <h2 id="items-title" className="mb-3 font-semibold">Items ({cart.summary.count})</h2>
            <ul className="divide-y divide-gray-100">
              {cart.items.map((i) => (
                <li key={i._id} className="flex items-center gap-3 py-2">
                  <LazyImage src={i.product.image} alt="" className="aspect-[3/4] w-12 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">{i.product.title}</p>
                    <p className="text-xs text-gray-500">
                      {[i.size && `Size ${i.size}`, i.color, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(i.product.price * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <Link to="/cart" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">Edit bag</Link>
          </section>
        </div>

        <aside className="card h-fit p-4 md:sticky md:top-32">
          <PriceSummary {...cart.summary} />
          {blocked && <p className="mt-3 text-sm text-red-600" role="alert">Some items exceed available stock. <Link to="/cart" className="underline">Update your bag</Link>.</p>}
          <button type="button" className="btn-primary mt-4 hidden w-full py-3 md:flex" onClick={placeOrder} disabled={placing || blocked || saved.loading}>
            {placing ? 'Placing order…' : `Place order · ${formatPrice(cart.summary.total)}`}
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 z-20 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-2.5 md:hidden" style={{ bottom: 'calc(3.55rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex-1">
          <p className="text-lg font-bold leading-tight">{formatPrice(cart.summary.total)}</p>
          <p className="text-xs text-gray-500">Cash on Delivery</p>
        </div>
        <button type="button" className="btn-primary flex-1 py-3" onClick={placeOrder} disabled={placing || blocked || saved.loading}>
          {placing ? 'Placing…' : 'Place order'}
        </button>
      </div>
    </div>
  );
}
