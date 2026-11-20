// Small inline SVG icon set (no icon library dependency). Decorative by default (aria-hidden).
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

const icon = (children) => {
  const Icon = (p) => <svg {...base} {...p}>{children}</svg>;
  return Icon;
};

export const HomeIcon = icon(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />);
export const GridIcon = icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>);
export const HeartIcon = icon(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />);
export const BagIcon = icon(<><path d="M6 7h12l1 14H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></>);
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const EyeIcon = icon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOffIcon = icon(<><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>);
export const CloseIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />);
export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />);
export const FilterIcon = icon(<path d="M4 5h16M7 12h10M10 19h4" />);
export const SortIcon = icon(<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />);
export const ClockIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const TrashIcon = icon(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = icon(<path d="M5 12h14" />);
export const CheckIcon = icon(<path d="m5 12 5 5L20 7" />);
export const TruckIcon = icon(<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>);
export const PackageIcon = icon(<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>);
export const LogoutIcon = icon(<><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l-5-5 5-5M5 12h11" /></>);
export const AlertIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>);
export const ShieldIcon = icon(<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />);
export const ReturnIcon = icon(<><path d="M4 9h11a5 5 0 0 1 0 10H8" /><path d="M8 5 4 9l4 4" /></>);
export const CashIcon = icon(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>);
export const MapPinIcon = icon(<><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>);
export const StarIcon = (p) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);
