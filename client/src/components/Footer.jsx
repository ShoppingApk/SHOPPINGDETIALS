import { Link } from 'react-router-dom';
import { CATEGORIES } from '../utils/constants';
import { CashIcon, ReturnIcon, ShieldIcon, TruckIcon } from './Icons';

const PROMISES = [
  { Icon: CashIcon, title: 'Cash on Delivery', text: 'Pay when it arrives' },
  { Icon: TruckIcon, title: 'Free delivery', text: 'On orders above ₹499' },
  { Icon: ReturnIcon, title: 'Easy cancellation', text: 'Cancel any time before shipping' },
  { Icon: ShieldIcon, title: 'Secure account', text: 'Your data stays protected' },
];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
        {PROMISES.map(({ Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
              <Icon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-gray-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 border-t border-gray-100 px-4 py-6 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold text-brand-700">kaasni</p>
          <p className="mt-1 text-gray-500">Affordable fashion, home and beauty, delivered across India.</p>
        </div>
        <nav aria-label="Shop">
          <p className="mb-2 font-semibold">Shop</p>
          <ul className="grid grid-cols-2 gap-1 text-gray-600">
            {CATEGORIES.map(({ name }) => (
              <li key={name}>
                <Link to={`/products?category=${encodeURIComponent(name)}`} className="hover:text-brand-600">{name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Help">
          <p className="mb-2 font-semibold">My account</p>
          <ul className="space-y-1 text-gray-600">
            <li><Link to="/orders" className="hover:text-brand-600">Orders</Link></li>
            <li><Link to="/wishlist" className="hover:text-brand-600">Wishlist</Link></li>
            <li><Link to="/profile" className="hover:text-brand-600">Profile</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Kaasni. Demo store, no real payments.
      </p>
    </footer>
  );
}
