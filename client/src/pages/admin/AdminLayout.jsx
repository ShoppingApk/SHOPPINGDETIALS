import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminLayout() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl">Admin panel</h1>
      </div>
      <nav aria-label="Admin sections" className="-mx-4 mb-5 overflow-x-auto border-b border-gray-200 px-4">
        <ul className="flex gap-6">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `block whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition ${isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-brand-600'}`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
