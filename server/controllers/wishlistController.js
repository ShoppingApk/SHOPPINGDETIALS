const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');

const CARD_FIELDS = 'title brand category price mrp discountPercent images rating numReviews sizes stock isActive';

async function wishlistData(userId) {
  const list = await Wishlist.findOne({ user: userId }).populate({ path: 'products', select: CARD_FIELDS }).lean();
  const products = (list?.products || []).filter((p) => p && p.isActive);
  return { products, ids: products.map((p) => p._id) };
}

// GET /api/wishlist
exports.getWishlist = asyncHandler(async (req, res) => ok(res, await wishlistData(req.user._id)));

// POST /api/wishlist/:productId — adds if absent, removes if present.
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const list = await Wishlist.findOne({ user: req.user._id }).select('products').lean();
  const inList = list?.products.some((id) => String(id) === productId);

  if (inList) {
    await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: productId } });
  } else {
    if (!(await Product.exists({ _id: productId, isActive: true }))) throw new HttpError(404, 'Product not found');
    await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: productId } }, { upsert: true });
  }

  ok(res, { added: !inList, ...(await wishlistData(req.user._id)) }, inList ? 'Removed from wishlist' : 'Added to wishlist');
});
