import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import LazyImage from '../../components/LazyImage';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import ProductForm from '../../components/admin/ProductForm';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { PlusIcon, SearchIcon } from '../../components/Icons';
import { adminApi } from '../../api/admin';
import { errMsg } from '../../api/client';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { CATEGORIES } from '../../utils/constants';
import { firstImage, formatPrice } from '../../utils/format';

export default function AdminProducts() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const category = sp.get('category') || '';
  const status = sp.get('status') || '';
  const lowStock = sp.get('lowStock') || '';
  const [q, setQ] = useState(sp.get('q') || '');
  const term = useDebounce(q.trim(), 300);

  const setParam = (patch) => {
    const next = Object.fromEntries([...sp.entries()]);
    Object.entries({ ...patch, page: patch.page ?? '' }).forEach(([k, v]) => (v ? (next[k] = String(v)) : delete next[k]));
    setSp(next);
  };

  const list = useFetch(
    (signal) => adminApi.products({ page, category, status, lowStock, q: term }, signal),
    [page, category, status, lowStock, term]
  );
  const config = useFetch(() => adminApi.config(), []);

  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const replace = (p) =>
    list.setData((d) => (d ? { ...d, products: d.products.map((x) => (x._id === p._id ? p : x)) } : d));

  const toggleActive = async (p) => {
    setBusyId(p._id);
    try {
      const { product } = await adminApi.setProductActive(p._id, !p.isActive);
      replace(product);
      toast.success(product.isActive ? 'Product is visible in the shop' : 'Product hidden from the shop');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteProduct(toDelete._id);
      toast.success('Product deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDeleting(false);
    }
  };

  const data = list.data;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search products</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (page > 1) setParam({ page: '' });
            }}
            placeholder="Search title or brand"
            className="input pl-9"
          />
        </label>
        <label className="sr-only" htmlFor="ap-cat">Category</label>
        <select id="ap-cat" value={category} onChange={(e) => setParam({ category: e.target.value })} className="input w-auto">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="ap-status">Visibility</label>
        <select id="ap-status" value={status} onChange={(e) => setParam({ status: e.target.value })} className="input w-auto">
          <option value="">Visible &amp; hidden</option>
          <option value="active">Visible only</option>
          <option value="inactive">Hidden only</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" checked={!!lowStock} onChange={(e) => setParam({ lowStock: e.target.checked ? '1' : '' })} />
          Low stock
        </label>
        <button type="button" onClick={() => setEditing(null)} className="btn-primary ml-auto py-2">
          <PlusIcon width={18} height={18} /> Add product
        </button>
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !data ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !data.products.length ? (
        <EmptyState emoji="📦" title="No products found" message="Try different filters, or add a new product." />
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-500">{data.pagination.total} product{data.pagination.total === 1 ? '' : 's'}</p>
          <ul className={`card divide-y divide-gray-100 ${list.loading ? 'opacity-60' : ''}`}>
            {data.products.map((p) => (
              <li key={p._id} className="flex gap-3 p-3">
                <LazyImage src={firstImage(p)} alt="" className="aspect-[3/4] w-12 shrink-0 self-start rounded-md" />
                <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium md:truncate">{p.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {[p.brand, p.category, p.subCategory].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:mt-0 md:flex-nowrap">
                <p className="text-sm md:w-32">
                  <span className="font-semibold">{formatPrice(p.price)}</span>{' '}
                  <span className="text-xs text-gray-400 line-through">{formatPrice(p.mrp)}</span>
                </p>
                <p className={`text-sm md:w-24 ${p.stock === 0 ? 'font-semibold text-red-600' : p.stock < 10 ? 'font-semibold text-orange-600' : 'text-gray-700'}`}>
                  {p.stock} in stock
                </p>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  disabled={busyId === p._id}
                  role="switch"
                  aria-checked={p.isActive}
                  aria-label={`${p.title} visible in shop`}
                  className={`w-20 rounded-full px-2.5 py-1 text-xs font-semibold ${p.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p.isActive ? 'Visible' : 'Hidden'}
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditing(p)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50">Edit</button>
                  <button type="button" onClick={() => setToDelete(p)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                </div>
                </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pagination.pages} onChange={(p) => setParam({ page: p > 1 ? p : '' })} />
        </>
      )}

      <ProductForm
        open={editing !== undefined}
        product={editing || null}
        uploadEnabled={!!config.data?.imageUpload}
        onClose={() => setEditing(undefined)}
        onSaved={(saved, created) => {
          toast.success(created ? 'Product created' : 'Product updated');
          setEditing(undefined);
          if (created) list.reload();
          else replace(saved);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        message={`“${toDelete?.title}” will be removed from the shop, from every bag and wishlist, along with its reviews. Past orders keep their copy. To keep it but stop selling it, hide it instead.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
