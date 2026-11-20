import { Link } from 'react-router-dom';
import { CATEGORIES } from '../utils/constants';

// Round category shortcuts. `active` highlights the current category.
export default function CategoryChips({ active, counts }) {
  return (
    <nav aria-label="Shop by category" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-4 pb-1 md:justify-between">
        {CATEGORIES.map(({ name, emoji, tint }) => {
          const isActive = active === name;
          return (
            <li key={name} className="shrink-0">
              <Link
                to={`/products?category=${encodeURIComponent(name)}`}
                aria-current={isActive ? 'page' : undefined}
                className="group flex w-[4.5rem] flex-col items-center gap-1.5 rounded-xl p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 md:w-24"
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full text-2xl transition group-hover:scale-105 md:h-20 md:w-20 md:text-4xl ${tint} ${
                    isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                  }`}
                  aria-hidden="true"
                >
                  {emoji}
                </span>
                <span className={`text-xs font-medium md:text-sm ${isActive ? 'text-brand-600' : 'text-gray-700'}`}>{name}</span>
                {counts?.[name] !== undefined && <span className="sr-only">{counts[name]} products</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
