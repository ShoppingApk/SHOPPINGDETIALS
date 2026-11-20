export const CATEGORIES = [
  { name: 'Women', emoji: '👗', tint: 'bg-pink-100' },
  { name: 'Men', emoji: '👔', tint: 'bg-indigo-100' },
  { name: 'Kids', emoji: '🧸', tint: 'bg-amber-100' },
  { name: 'Home', emoji: '🏠', tint: 'bg-green-100' },
  { name: 'Beauty', emoji: '💄', tint: 'bg-purple-100' },
  { name: 'Electronics', emoji: '🎧', tint: 'bg-slate-200' },
];

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'New arrivals' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'discount', label: 'Better discount' },
];

export const PRICE_RANGES = [
  { label: 'Under ₹299', min: '', max: '299' },
  { label: '₹300 – ₹499', min: '300', max: '499' },
  { label: '₹500 – ₹999', min: '500', max: '999' },
  { label: '₹1000 & above', min: '1000', max: '' },
];

export const BANNERS = [
  {
    id: 'women',
    eyebrow: 'Ethnic Fest',
    title: 'Kurtis & Sarees from ₹299',
    text: 'Festive picks with up to 70% off',
    cta: 'Shop Women',
    to: '/products?category=Women',
    className: 'from-brand-500 via-brand-600 to-plum-600',
    emoji: '👗',
  },
  {
    id: 'electronics',
    eyebrow: 'Gadget Days',
    title: 'Earbuds, Watches & more',
    text: 'Top-rated tech under ₹1,499',
    cta: 'Explore Electronics',
    to: '/products?category=Electronics&sort=rating',
    className: 'from-plum-600 via-plum-500 to-indigo-500',
    emoji: '🎧',
  },
  {
    id: 'home',
    eyebrow: 'Home Makeover',
    title: 'Decor & Kitchen Essentials',
    text: 'Fresh looks starting at ₹199',
    cta: 'Shop Home',
    to: '/products?category=Home',
    className: 'from-emerald-500 via-teal-500 to-cyan-600',
    emoji: '🏠',
  },
  {
    id: 'deals',
    eyebrow: 'Mega Value Days',
    title: 'Biggest discounts, every day',
    text: 'Free delivery on orders above ₹499',
    cta: 'See all deals',
    to: '/products?sort=discount',
    className: 'from-orange-500 via-rose-500 to-brand-600',
    emoji: '🛍️',
  },
];

export const FREE_SHIPPING_ABOVE = 499;

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
