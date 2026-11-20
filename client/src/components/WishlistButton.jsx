import { useWishlist } from '../context/WishlistContext';
import useRequireLogin from '../hooks/useRequireLogin';
import { HeartIcon } from './Icons';

export default function WishlistButton({ productId, title = 'product', className = '', size = 20, withLabel = false }) {
  const { has, toggle } = useWishlist();
  const requireLogin = useRequireLogin();
  const active = has(productId);

  const onClick = (e) => {
    e.preventDefault(); // button may sit inside a product link
    e.stopPropagation();
    if (!requireLogin('Log in to save items to your wishlist')) return;
    toggle(productId);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
      className={`inline-flex items-center justify-center gap-2 transition ${className}`}
    >
      <HeartIcon
        width={size}
        height={size}
        key={String(active)}
        className={active ? 'animate-pop fill-brand-500 text-brand-500' : 'text-gray-600'}
      />
      {withLabel && <span>{active ? 'Wishlisted' : 'Wishlist'}</span>}
    </button>
  );
}
