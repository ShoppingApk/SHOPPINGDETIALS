import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import PriceTag from '../components/PriceTag';
import RatingStars from '../components/RatingStars';
import QuantityStepper from '../components/QuantityStepper';
import WishlistButton from '../components/WishlistButton';
import ReviewsSection from '../components/ReviewsSection';
import ProductRail from '../components/ProductRail';
import Skeleton, { LineSkeleton } from '../components/Skeleton';
import EmptyState, { ErrorState } from '../components/EmptyState';
import { BagIcon, CashIcon, ChevronRightIcon, TruckIcon } from '../components/Icons';
import { productsApi } from '../api/products';
import useFetch from '../hooks/useFetch';
import useRequireLogin from '../hooks/useRequireLogin';
import { useCart } from '../context/CartContext';
import { FREE_SHIPPING_ABOVE } from '../utils/constants';

function DetailSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <LineSkeleton lines={4} />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const cart = useCart();

  const { data, loading, error, reload, setData } = useFetch((signal) => productsApi.get(id, signal), [id]);
  const similar = useFetch((signal) => productsApi.similar(id, signal), [id]);
  const product = data?.product;

  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [busy, setBusy] = useState('');
  const [added, setAdded] = useState(false);
  const sizeRef = useRef(null);

  // Reset selections when moving to another product.
  useEffect(() => {
    setSize('');
    setQty(1);
    setSizeError(false);
    setAdded(false);
  }, [id]);
  useEffect(() => {
    setColor(product?.colors?.[0] || '');
  }, [product?._id, product?.colors]);

  if (loading && !product) return <DetailSkeleton />;
  if (error) {
    return error.toLowerCase().includes('not found') ? (
      <EmptyState emoji="📦" title="Product not found" message="It may have been removed or is no longer available." actionLabel="Continue shopping" actionTo="/products" />
    ) : (
      <ErrorState message={error} onRetry={reload} />
    );
  }
  if (!product) return null;

  const soldOut = product.stock < 1;
  const maxQty = Math.max(1, Math.min(10, product.stock));
  const needsSize = product.sizes?.length > 0;

  const addToBag = async (thenCheckout = false) => {
    if (!requireLogin('Log in to add items to your bag')) return;
    if (needsSize && !size) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(thenCheckout ? 'buy' : 'add');
    const ok = await cart.add({ productId: product._id, size, color, quantity: qty });
    setBusy('');
    if (ok) {
      setAdded(true);
      if (thenCheckout) navigate('/checkout');
    }
  };

  const actions = (
    <div className="flex gap-3">
      {added ? (
        <Link to="/cart" className="btn-outline flex-1 py-3">
          Go to bag <ChevronRightIcon width={18} height={18} />
        </Link>
      ) : (
        <button type="button" className="btn-outline flex-1 py-3" onClick={() => addToBag(false)} disabled={soldOut || !!busy}>
          <BagIcon width={20} height={20} />
          {busy === 'add' ? 'Adding…' : 'Add to bag'}
        </button>
      )}
      <button type="button" className="btn-primary flex-1 py-3" onClick={() => addToBag(true)} disabled={soldOut || !!busy}>
        {soldOut ? 'Out of stock' : busy === 'buy' ? 'Please wait…' : 'Buy now'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-600">{product.category}</Link></li>
          {product.subCategory && (
            <>
              <li aria-hidden="true">/</li>
              <li className="truncate text-gray-700" aria-current="page">{product.subCategory}</li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <div className="md:sticky md:top-32 md:self-start">
          <ImageGallery images={product.images} title={product.title} />
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                {product.brand && <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{product.brand}</p>}
                <h1 className="mt-0.5 text-xl font-semibold text-gray-900 md:text-2xl">{product.title}</h1>
              </div>
              <WishlistButton productId={product._id} title={product.title} className="h-10 w-10 shrink-0 rounded-full border border-gray-200 hover:bg-gray-50" size={22} />
            </div>
            {product.numReviews > 0 && (
              <a href="#reviews" className="mt-2 inline-block">
                <RatingStars value={product.rating} count={product.numReviews} />
              </a>
            )}
          </div>

          <div>
            <PriceTag price={product.price} mrp={product.mrp} discountPercent={product.discountPercent} size="lg" />
            <p className="mt-0.5 text-xs text-gray-500">Inclusive of all taxes</p>
            {soldOut ? (
              <p className="mt-2 font-semibold text-red-600">Out of stock</p>
            ) : (
              product.stock <= 10 && <p className="mt-2 text-sm font-medium text-orange-600">Hurry, only {product.stock} left!</p>
            )}
          </div>

          {product.colors?.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Colour: <span className="font-normal text-gray-600">{color}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <label key={c} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 ${color === c ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-gray-300 hover:border-brand-300'}`}>
                    <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {needsSize && (
            <fieldset ref={sizeRef} aria-describedby={sizeError ? 'size-error' : undefined}>
              <legend className="mb-2 text-sm font-semibold">Select size</legend>
              <div className={`flex flex-wrap gap-2 ${sizeError ? 'animate-shake' : ''}`}>
                {product.sizes.map((s) => (
                  <label
                    key={s}
                    className={`grid min-w-[3rem] cursor-pointer place-items-center rounded-lg border px-3 py-2 text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 ${
                      size === s ? 'border-brand-600 bg-brand-600 text-white' : sizeError ? 'border-red-400' : 'border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => {
                        setSize(s);
                        setSizeError(false);
                      }}
                      className="sr-only"
                    />
                    {s}
                  </label>
                ))}
              </div>
              {sizeError && <p id="size-error" className="mt-2 text-sm text-red-600" role="alert">Please select a size</p>}
            </fieldset>
          )}

          {!soldOut && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Quantity</span>
              <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
            </div>
          )}

          <div className="hidden md:block">{actions}</div>

          <ul className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <li className="flex items-center gap-2"><CashIcon width={18} height={18} className="text-brand-600" /> Cash on Delivery available</li>
            <li className="flex items-center gap-2"><TruckIcon width={18} height={18} className="text-brand-600" /> Free delivery on orders above ₹{FREE_SHIPPING_ABOVE}</li>
          </ul>

          <section aria-labelledby="desc-title">
            <h2 id="desc-title" className="mb-1 font-semibold">Product details</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{product.description || 'No description available.'}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-500">Category</dt>
              <dd>{product.category}{product.subCategory ? ` · ${product.subCategory}` : ''}</dd>
              {product.brand && (<><dt className="text-gray-500">Brand</dt><dd>{product.brand}</dd></>)}
              {product.sizes?.length > 0 && (<><dt className="text-gray-500">Sizes</dt><dd>{product.sizes.join(', ')}</dd></>)}
            </dl>
          </section>
        </div>
      </div>

      <div id="reviews" className="scroll-mt-32">
        <ReviewsSection
          productId={product._id}
          rating={product.rating}
          numReviews={product.numReviews}
          onRatingChange={(stats) => setData((d) => ({ ...d, product: { ...d.product, ...stats } }))}
        />
      </div>

      <ProductRail
        title="Similar products"
        products={similar.data?.products}
        loading={similar.loading}
        error={similar.error}
        viewAllTo={`/products?category=${encodeURIComponent(product.category)}`}
      />

      {/* Phones: actions pinned above the bottom navigation */}
      <div
        className="fixed inset-x-0 z-20 border-t border-gray-200 bg-white px-4 py-2.5 md:hidden"
        style={{ bottom: 'calc(3.55rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {actions}
      </div>
    </div>
  );
}
