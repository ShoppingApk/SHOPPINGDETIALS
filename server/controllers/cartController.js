const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const { buildCart, CART_POPULATE } = require('../utils/cartSummary');

const MAX_QTY = 10;

async function sendCart(res, userId, message = 'OK', status = 200) {
  const cart = await Cart.findOne({ user: userId }).populate(CART_POPULATE);
  const data = buildCart(cart);
  // Quietly drop items whose product no longer exists or was hidden.
  if (data.unavailable.length) {
    await Cart.updateOne({ user: userId }, { $pull: { items: { _id: { $in: data.unavailable } } } });
  }
  const { unavailable, ...rest } = data;
  ok(res, { ...rest, removedUnavailable: unavailable.length }, message, status);
}

// GET /api/cart
exports.getCart = asyncHandler(async (req, res) => sendCart(res, req.user._id));

// POST /api/cart  { productId, size?, color?, quantity? }
// size is required when the product has sizes; color defaults to the first option.
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, size = '', color = '', quantity = 1 } = req.body;
  const product = await Product.findOne({ _id: productId, isActive: true }).select('sizes colors stock');
  if (!product) throw new HttpError(404, 'Product not found');

  const match = (list, v) => list.find((s) => s.toLowerCase() === String(v).toLowerCase());
  let cleanSize = '';
  if (product.sizes.length) {
    cleanSize = match(product.sizes, size);
    if (!cleanSize) throw new HttpError(400, `Please select a size (${product.sizes.join(', ')})`);
  }
  let cleanColor = '';
  if (product.colors.length) {
    cleanColor = color ? match(product.colors, color) : product.colors[0];
    if (!cleanColor) throw new HttpError(400, `Please select a colour (${product.colors.join(', ')})`);
  }
  if (product.stock < 1) throw new HttpError(400, 'This product is out of stock');

  const cart = await Cart.forUser(req.user._id);
  const existing = cart.items.find(
    (i) => String(i.product) === String(productId) && i.size === cleanSize && (i.color || '') === cleanColor
  );
  const newQty = (existing?.quantity || 0) + quantity;
  if (newQty > MAX_QTY) throw new HttpError(400, `You can add up to ${MAX_QTY} of an item`);
  if (newQty > product.stock) throw new HttpError(400, `Only ${product.stock} left in stock`);

  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: productId, size: cleanSize, color: cleanColor, quantity: newQty });
  await cart.save();

  await sendCart(res, req.user._id, 'Added to bag', existing ? 200 : 201);
});

// PATCH /api/cart/:itemId  { quantity }
exports.updateCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.id(req.params.itemId);
  if (!item) throw new HttpError(404, 'Item not in bag');

  const product = await Product.findById(item.product).select('stock');
  if (product && req.body.quantity > product.stock) throw new HttpError(400, `Only ${product.stock} left in stock`);

  item.quantity = req.body.quantity;
  await cart.save();
  await sendCart(res, req.user._id, 'Quantity updated');
});

// DELETE /api/cart/:itemId
exports.removeCartItem = asyncHandler(async (req, res) => {
  const r = await Cart.updateOne({ user: req.user._id }, { $pull: { items: { _id: req.params.itemId } } });
  if (!r.modifiedCount) throw new HttpError(404, 'Item not in bag');
  await sendCart(res, req.user._id, 'Item removed');
});

// DELETE /api/cart
exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  await sendCart(res, req.user._id, 'Bag cleared');
});
