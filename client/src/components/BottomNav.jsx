import { NavLink } from 'react-router-dom';
import { BagIcon, GridIcon, HeartIcon, HomeIcon, UserIcon } from './Icons';
import CountBadge from './CountBadge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

// Fixed bottom navigation, phones only.
export default function BottomNav() {
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();

  const items = [
    { to: '/', label: 'Home', Icon: HomeIcon, end: true },
    { to: '/categories', label: 'Categories', Icon: GridIcon },
    { to: '/wishlist', label: 'Wishlist', Icon: HeartIcon, count: wishCount },
    { to: '/cart', label: 'Cart', Icon: BagIcon, count: cartCount },
    { to: '/profile', label: 'Profile', Icon: UserIcon },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, end, count }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-gray-500'}`
              }
              aria-label={count ? `${label}, ${count} item${count === 1 ? '' : 's'}` : label}
            >
              <span className="relative">
                <Icon width={22} height={22} />
                <CountBadge count={count} />
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
