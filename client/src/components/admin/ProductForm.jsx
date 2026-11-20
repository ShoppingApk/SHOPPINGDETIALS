import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../Modal';
import TagInput from './TagInput';
import { CloseIcon, PlusIcon } from '../Icons';
import { adminApi } from '../../api/admin';
import { errMsg, fieldErrors } from '../../api/client';
import { CATEGORIES } from '../../utils/constants';

const SIZE_PRESETS = {
  Women: ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
  Men: ['S', 'M', 'L', 'XL', 'XXL'],
  Kids: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
};
const MAX_IMAGES = 5;
const MAX_FILE_MB = 2;
const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fromProduct = (p) => ({
  title: p?.title || '',
  brand: p?.brand || '',
  category: p?.category || '',
  subCategory: p?.subCategory || '',
  price: p?.price ?? '',
  mrp: p?.mrp ?? '',
  stock: p?.stock ?? '',
  description: p?.description || '',
  sizes: p?.sizes || [],
  colors: p?.colors || [],
  tags: p?.tags || [],
  isActive: p?.isActive ?? true,
});

function validate(f, imageCount) {
  const e = {};
  if (f.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
  if (!f.category) e.category = 'Choose a category';
  if (f.price === '' || Number(f.price) < 0) e.price = 'Enter a price';
  if (f.mrp === '' || Number(f.mrp) < 0) e.mrp = 'Enter the MRP';
  if (!e.price && !e.mrp && Number(f.price) > Number(f.mrp)) e.price = 'Price cannot be more than MRP';
  if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) e.stock = 'Enter stock (0 or more)';
  if (imageCount < 1) e.images = 'Add at least one image';
  if (imageCount > MAX_IMAGES) e.images = `A product can have up to ${MAX_IMAGES} images`;
  return e;
}

// Create (product = null) or edit a product. Calls onSaved(product) on success.
export default function ProductForm({ open, product, uploadEnabled, onClose, onSaved }) {
  const [form, setForm] = useState(fromProduct(product));
  const [kept, setKept] = useState(product?.images || []); // existing images still kept
  const [urls, setUrls] = useState([]); // new image links
  const [urlDraft, setUrlDraft] = useState('');
  const [files, setFiles] = useState([]); // { file, preview }
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromProduct(product));
    setKept(product?.images || []);
    setUrls([]);
    setUrlDraft('');
    setFiles([]);
    setErrors({});
    setError('');
  }, [open, product]);

  // Release preview URLs only when the form closes/unmounts (not on every change).
  const previews = useRef([]);
  previews.current = files.map((f) => f.preview);
  useEffect(() => {
    if (open) return undefined;
    previews.current.forEach((u) => URL.revokeObjectURL(u));
    return undefined;
  }, [open]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const imageCount = kept.length + urls.length + files.length;
  const discount = useMemo(() => {
    const p = Number(form.price);
    const m = Number(form.mrp);
    return m > 0 && p <= m ? Math.round(((m - p) / m) * 100) : 0;
  }, [form.price, form.mrp]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => (x[k] ? { ...x, [k]: '' } : x)); // clear a field's error as soon as it's edited
  };

  const addUrl = () => {
    const u = urlDraft.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) {
      setErrors((x) => ({ ...x, images: 'Enter a full image link starting with http:// or https://' }));
      return;
    }
    setUrls((list) => [...list, u]);
    setErrors((x) => ({ ...x, images: '' }));
    setUrlDraft('');
    setErrors((x) => ({ ...x, images: '' }));
  };

  const addFiles = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    const bad = picked.find((f) => !FILE_TYPES.includes(f.type) || f.size > MAX_FILE_MB * 1024 * 1024);
    if (bad) {
      setErrors((x) => ({ ...x, images: `Images must be JPG, PNG, WEBP or GIF and at most ${MAX_FILE_MB} MB` }));
      return;
    }
    setFiles((list) => [...list, ...picked.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    setErrors((x) => ({ ...x, images: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, imageCount);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const fd = new FormData();
    for (const k of ['title', 'brand', 'category', 'subCategory', 'price', 'mrp', 'stock', 'description']) fd.append(k, String(form[k]).trim());
    fd.append('isActive', String(form.isActive));
    fd.append('sizes', JSON.stringify(form.sizes));
    fd.append('colors', JSON.stringify(form.colors));
    fd.append('tags', JSON.stringify(form.tags));
    if (urls.length) fd.append('imageUrls', JSON.stringify(urls));
    if (product) fd.append('keepImages', JSON.stringify(kept.map((i) => i.url)));
    files.forEach((f) => fd.append('images', f.file));

    setBusy(true);
    setError('');
    try {
      const { product: saved } = product ? await adminApi.updateProduct(product._id, fd) : await adminApi.createProduct(fd);
      onSaved(saved, !product);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errMsg(err, 'Could not save the product'));
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, input) => (
    <div>
      <label htmlFor={`pf-${k}`} className="label">{label}</label>
      {input}
      {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>}
    </div>
  );
  const inputCls = (k) => `input ${errors[k] ? 'border-red-400' : ''}`;

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={product ? 'Edit product' : 'Add product'}
      size="lg"
      footer={
        <div className="flex items-center gap-3">
          {error && <p className="flex-1 text-sm text-red-600" role="alert">{error}</p>}
          <button type="button" className="btn-outline ml-auto" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">{field('title', 'Title', <input id="pf-title" className={inputCls('title')} value={form.title} onChange={set('title')} maxLength={150} />)}</div>
        {field('brand', 'Brand', <input id="pf-brand" className="input" value={form.brand} onChange={set('brand')} maxLength={60} />)}
        {field(
          'category',
          'Category',
          <select id="pf-category" className={inputCls('category')} value={form.category} onChange={set('category')}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        )}
        {field('subCategory', 'Sub-category', <input id="pf-subCategory" className="input" value={form.subCategory} onChange={set('subCategory')} maxLength={60} placeholder="e.g. Kurtis" />)}
        {field('stock', 'Stock', <input id="pf-stock" type="number" min="0" step="1" className={inputCls('stock')} value={form.stock} onChange={set('stock')} />)}
        {field('price', 'Selling price (₹)', <input id="pf-price" type="number" min="0" className={inputCls('price')} value={form.price} onChange={set('price')} />)}
        <div>
          {field('mrp', 'MRP (₹)', <input id="pf-mrp" type="number" min="0" className={inputCls('mrp')} value={form.mrp} onChange={set('mrp')} />)}
          {discount > 0 && <p className="mt-1 text-xs font-medium text-green-600">{discount}% off</p>}
        </div>
        <div className="sm:col-span-2">
          {field('description', 'Description', <textarea id="pf-description" rows={3} className="input resize-y" value={form.description} onChange={set('description')} maxLength={3000} />)}
        </div>
        <div>
          <label htmlFor="pf-sizes" className="label">Sizes</label>
          <TagInput id="pf-sizes" value={form.sizes} onChange={(sizes) => setForm((f) => ({ ...f, sizes }))} placeholder="Type and press Enter" suggestions={SIZE_PRESETS[form.category] || []} />
        </div>
        <div>
          <label htmlFor="pf-colors" className="label">Colours</label>
          <TagInput id="pf-colors" value={form.colors} onChange={(colors) => setForm((f) => ({ ...f, colors }))} placeholder="e.g. Pink, Black" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-tags" className="label">Search tags</label>
          <TagInput id="pf-tags" value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} placeholder="Words shoppers might search for" max={20} />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="label">Images ({imageCount}/{MAX_IMAGES})</legend>
          <div className="flex flex-wrap gap-2">
            {[
              ...kept.map((img) => ({ key: img.url, src: img.url, remove: () => setKept((k) => k.filter((x) => x.url !== img.url)) })),
              ...urls.map((u) => ({ key: u, src: u, remove: () => setUrls((l) => l.filter((x) => x !== u)) })),
              ...files.map((f) => ({
                key: f.preview,
                src: f.preview,
                remove: () => {
                  URL.revokeObjectURL(f.preview);
                  setFiles((l) => l.filter((x) => x !== f));
                },
              })),
            ].map((img, i) => (
              <div key={img.key} className="relative h-28 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <img src={img.src} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-center text-[10px] text-white">Main</span>}
                <button type="button" onClick={img.remove} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-gray-700 shadow hover:text-red-600" aria-label={`Remove image ${i + 1}`}>
                  <CloseIcon width={14} height={14} />
                </button>
              </div>
            ))}
            {uploadEnabled && imageCount < MAX_IMAGES && (
              <label className="grid h-28 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-300 text-center text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600">
                <span><PlusIcon className="mx-auto" width={20} height={20} />Upload</span>
                <input type="file" accept={FILE_TYPES.join(',')} multiple className="sr-only" onChange={addFiles} />
              </label>
            )}
          </div>
          {imageCount < MAX_IMAGES && (
            <div className="mt-2 flex gap-2">
              <label htmlFor="pf-url" className="sr-only">Image link</label>
              <input
                id="pf-url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                placeholder="https://… image link"
                className="input flex-1"
              />
              <button type="button" onClick={addUrl} className="btn-outline px-3 py-2 text-sm">Add link</button>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {uploadEnabled ? `Upload JPG/PNG/WEBP/GIF up to ${MAX_FILE_MB} MB, or paste image links.` : 'Image upload needs Cloudinary (see README). Paste image links instead.'}
          </p>
          {errors.images && <p className="mt-1 text-xs text-red-600">{errors.images}</p>}
        </fieldset>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          Visible in the shop
        </label>
      </form>
    </Modal>
  );
}
