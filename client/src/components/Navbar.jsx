import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo';
import SearchBar from './SearchBar';
import ProfileMenu from './ProfileMenu';
import CountBadge from './CountBadge';
import { BagIcon, HeartIcon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useChat } from '../context/ChatContext';
import { CATEGORIES } from '../utils/constants';

// Phones: logo + bag on top, search underneath (other links live in BottomNav).
// Desktop: logo, search, wishlist, bag and account menu, plus a row of category links.
export default function Navbar() {
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const { isChatUser, tryKeyword, onLogoTap } = useChat();
  const location = useLocation();
  const activeCategory = location.pathname === '/products' ? new URLSearchParams(location.search).get('category') : null;

  const iconLink = ({ isActive }) =>
    `relative flex flex-col items-center text-xs hover:text-brand-600 ${isActive ? 'text-brand-600' : 'text-gray-600'}`;

  return (
    <header
      className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 md:flex-nowrap">
        {/* Extra handlers are attached only for chatusers; for everyone else these are plain. */}
        <Logo onClick={isChatUser ? onLogoTap : undefined} />

        <SearchBar
          className="order-last w-full md:order-none md:max-w-2xl md:flex-1"
          onBeforeSearch={isChatUser ? tryKeyword : undefined}
        />

        {/* Phones: bag shortcut */}
        <Link to="/cart" className="relative ml-auto p-1 text-gray-700 md:hidden" aria-label={`Bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
          <BagIcon />
          <CountBadge count={cartCount} />
        </Link>

        {/* Desktop icons */}
        <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Account">
          <NavLink to="/wishlist" className={iconLink} aria-label={`Wishlist, ${wishCount} item${wishCount === 1 ? "" : "s"}`}>
            <span className="relative">
              <HeartIcon />
              <CountBadge count={wishCount} />
            </span>
            Wishlist
          </NavLink>
          <NavLink to="/cart" className={iconLink} aria-label={`Bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <span className="relative">
              <BagIcon />
              <CountBadge count={cartCount} />
            </span>
            Bag
          </NavLink>
          {user ? (
            <ProfileMenu />
          ) : (
            <Link to="/login" state={{ from: location.pathname + location.search }} className="btn-primary py-2 text-sm">
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Desktop category links */}
      <nav className="hidden border-t border-gray-100 md:block" aria-label="Categories">
        <ul className="mx-auto flex max-w-7xl gap-8 px-4">
          {CATEGORIES.map(({ name }) => (
            <li key={name}>
              <Link
                to={`/products?category=${encodeURIComponent(name)}`}
                aria-current={activeCategory === name ? 'page' : undefined}
                className={`block border-b-2 py-2.5 text-sm font-medium transition ${
                  activeCategory === name ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-700 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {name}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link to="/products?sort=discount" className="block py-2.5 text-sm font-semibold text-brand-600 hover:underline">
              Deals of the day
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
