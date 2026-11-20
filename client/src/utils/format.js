const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatPrice = (n) => inr.format(Number(n) || 0);

export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-IN', opts) : '';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

// Short readable order number from a Mongo id.
export const orderNo = (id = '') => `#${String(id).slice(-8).toUpperCase()}`;

export const firstImage = (p) => p?.images?.[0]?.url || p?.image || '';
