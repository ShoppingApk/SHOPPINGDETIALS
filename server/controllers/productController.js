const Product = require('../models/Product');
const { CATEGORIES } = require('../models/Product');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const cloud = require('../config/cloudinary');

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  relevance: { numReviews: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  rating: { rating: -1, numReviews: -1, _id: 1 },
  discount: { discountPercent: -1, _id: 1 },
};

// Fields needed for product cards (keeps list responses small).
const CARD_FIELDS = 'title brand category subCategory price mrp discountPercent images rating numReviews sizes colors stock';
const MAX_IMAGES = 5;

// ---------------- public ----------------

// GET /api/products?q=&category=&brand=&size=&minPrice=&maxPrice=&minRating=&sort=&page=&limit=
exports.listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, size, minPrice, maxPrice, minRating, sort = 'relevance' } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (brand) {
    // Comma-separated list, case-insensitive exact match.
    const brands = String(brand).split(',').map((b) => b.trim()).filter(Boolean).slice(0, 10);
    filter.brand = { $in: brands.map((b) => new RegExp(`^${escapeRx(b)}$`, 'i')) };
  }
  if (size) filter.sizes = new RegExp(`^${escapeRx(String(size).trim())}$`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (minRating !== undefined) filter.rating = { $gte: minRating };
  if (q) {
    // Partial, case-insensitive match; every word must appear in some field.
    const words = q.trim().split(/\s+/).slice(0, 6).map((w) => new RegExp(escapeRx(w), 'i'));
    filter.$and = words.map((rx) => ({
      $or: [{ title: rx }, { brand: rx }, { subCategory: rx }, { tags: rx }, { category: rx }, { colors: rx }],
    }));
  }

  const [products, total] = await Promise.all([
    Product.find(filter).select(CARD_FIELDS).sort(SORTS[sort] || SORTS.relevance).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  ok(res, {
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1, hasMore: page * limit < total },
  });
});

// GET /api/products/categories — every category with its product count.
exports.getCategories = asyncHandler(async (req, res) => {
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byName = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  ok(res, { categories: CATEGORIES.map((name) => ({ name, count: byName[name] || 0 })) });
});

// GET /api/products/filters?category= — brands, sizes, colours and price range for filter UIs.
exports.getFilters = asyncHandler(async (req, res) => {
  const match = { isActive: true };
  if (CATEGORIES.includes(req.query.category)) match.category = req.query.category;

  const [facets] = await Product.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        brands: { $addToSet: '$brand' },
        sizes: { $push: '$sizes' },
        colors: { $push: '$colors' },
        min: { $min: '$price' },
        max: { $max: '$price' },
      },
    },
  ]);
  const flatUnique = (arr = []) => [...new Set(arr.flat().filter(Boolean))];
  ok(res, {
    brands: (facets?.brands || []).filter(Boolean).sort(),
    sizes: flatUnique(facets?.sizes),
    colors: flatUnique(facets?.colors).sort(),
    priceRange: { min: facets?.min ?? 0, max: facets?.max ?? 0 },
  });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!product) throw new HttpError(404, 'Product not found');
  ok(res, { product });
});

// GET /api/products/:id/similar — same category, closest price first.
exports.getSimilar = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('category price').lean();
  if (!product) throw new HttpError(404, 'Product not found');

  const products = await Product.aggregate([
    { $match: { category: product.category, isActive: true, _id: { $ne: product._id } } },
    { $addFields: { priceGap: { $abs: { $subtract: ['$price', product.price] } } } },
    { $sort: { priceGap: 1 } },
    { $limit: 8 },
    { $project: Object.fromEntries(CARD_FIELDS.split(' ').map((f) => [f, 1])) },
  ]);
  ok(res, { products });
});

// ---------------- reviews ----------------

// GET /api/products/:id/reviews?page=
exports.listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 10;
  const filter = { product: req.params.id };
  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
    Review.countDocuments(filter),
  ]);
  ok(res, {
    reviews: reviews.map((r) => ({ ...r, user: { _id: r.user?._id, name: r.user?.name || 'Customer' } })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

// POST /api/products/:id/reviews  { rating, comment } — one per user; posting again updates it.
exports.addReview = asyncHandler(async (req, res) => {
  const exists = await Product.exists({ _id: req.params.id, isActive: true });
  if (!exists) throw new HttpError(404, 'Product not found');

  const existing = await Review.findOne({ user: req.user._id, product: req.params.id });
  let review;
  if (existing) {
    existing.rating = req.body.rating;
    existing.comment = req.body.comment ?? existing.comment;
    review = await existing.save();
  } else {
    review = await Review.create({ user: req.user._id, product: req.params.id, rating: req.body.rating, comment: req.body.comment || '' });
  }
  const stats = await Review.recalculate(req.params.id);
  ok(res, { review, product: { _id: req.params.id, ...stats } }, existing ? 'Review updated' : 'Review added', existing ? 200 : 201);
});

// ---------------- admin ----------------

// Collects images from uploaded files (Cloudinary) and/or imageUrls.
async function collectNewImages(req) {
  const images = [];
  if (req.files?.length) {
    if (!cloud.isConfigured) {
      throw new HttpError(400, 'Image upload is not configured (Cloudinary env vars missing). Send image links in "imageUrls" instead.');
    }
    for (const file of req.files) images.push(await cloud.uploadBuffer(file.buffer));
  }
  for (const url of req.body.imageUrls || []) images.push({ url, publicId: '' });
  return images;
}

const EDITABLE = ['title', 'description', 'category', 'subCategory', 'brand', 'price', 'mrp', 'stock', 'isActive', 'sizes', 'colors', 'tags'];

// POST /api/products  (admin) — multipart with "images" files, or JSON with imageUrls.
exports.createProduct = asyncHandler(async (req, res) => {
  const images = await collectNewImages(req);
  if (!images.length) throw new HttpError(422, 'Add at least one image (upload files or send imageUrls)');
  if (images.length > MAX_IMAGES) throw new HttpError(422, `A product can have up to ${MAX_IMAGES} images`);

  const data = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  try {
    const product = await Product.create({ ...data, images });
    ok(res, { product }, 'Product created', 201);
  } catch (err) {
    await cloud.destroy(images.map((i) => i.publicId)); // don't leave orphan uploads
    throw err;
  }
});

// PUT /api/products/:id  (admin) — partial update. keepImages lists current image URLs to keep.
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');

  const newImages = await collectNewImages(req);
  const keep = req.body.keepImages !== undefined ? new Set(req.body.keepImages) : null;
  const kept = keep ? product.images.filter((img) => keep.has(img.url)) : product.images;
  const removed = keep ? product.images.filter((img) => !keep.has(img.url)) : [];
  const images = [...kept, ...newImages];

  if (!images.length) throw new HttpError(422, 'A product needs at least one image');
  if (images.length > MAX_IMAGES) {
    await cloud.destroy(newImages.map((i) => i.publicId));
    throw new HttpError(422, `A product can have up to ${MAX_IMAGES} images`);
  }

  for (const k of EDITABLE) if (req.body[k] !== undefined) product[k] = req.body[k];
  product.images = images;

  try {
    await product.save(); // runs price<=mrp validation and recomputes discount
  } catch (err) {
    await cloud.destroy(newImages.map((i) => i.publicId));
    throw err;
  }
  await cloud.destroy(removed.map((i) => i.publicId));
  ok(res, { product }, 'Product updated');
});

// DELETE /api/products/:id  (admin) — removes the product, its reviews, images, and bag/wishlist entries.
// Past orders keep their own snapshot of title/price/image.
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');

  await Promise.all([
    Review.deleteMany({ product: product._id }),
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
    Wishlist.updateMany({}, { $pull: { products: product._id } }),
    cloud.destroy(product.images.map((i) => i.publicId)),
  ]);
  ok(res, { id: product._id }, 'Product deleted');
});
