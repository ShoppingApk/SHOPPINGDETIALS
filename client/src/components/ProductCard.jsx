import { memo } from 'react';
import { Link } from 'react-router-dom';
import LazyImage from './LazyImage';
import PriceTag from './PriceTag';
import RatingStars from './RatingStars';
import WishlistButton from './WishlistButton';
import { firstImage } from '../utils/format';

function ProductCard({ product, eager = false }) {
  const { _id, title, brand, price, mrp, discountPercent, rating, numReviews, stock } = product;
  const soldOut = stock !== undefined && stock < 1;

  return (
    <article className="card group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/product/${_id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
        <LazyImage src={firstImage(product)} alt={title} eager={eager} className="aspect-[3/4] w-full" imgClassName="transition duration-300 group-hover:scale-[1.03]" />
        {soldOut && (
          <span className="absolute inset-x-0 top-1/3 mx-auto w-fit rounded bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700">
            Out of stock
          </span>
        )}
        <div className="space-y-1 p-2.5">
          {brand && <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">{brand}</p>}
          <h3 className="line-clamp-1 text-sm text-gray-800">{title}</h3>
          <PriceTag price={price} mrp={mrp} discountPercent={discountPercent} />
          <div className="flex items-center justify-between gap-2">
            {numReviews > 0 ? <RatingStars value={rating} count={numReviews} /> : <span className="text-xs text-gray-400">No ratings yet</span>}
          </div>
          {!soldOut && stock !== undefined && stock <= 10 && <p className="text-xs font-medium text-orange-600">Only {stock} left</p>}
        </div>
      </Link>
      <WishlistButton
        productId={_id}
        title={title}
        className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 shadow-sm hover:bg-white"
        size={18}
      />
    </article>
  );
}

export default memo(ProductCard);
