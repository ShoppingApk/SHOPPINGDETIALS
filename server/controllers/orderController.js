const Order = require('../models/Order');
const { TRANSITIONS } = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const { buildCart, CART_POPULATE } = require('../utils/cartSummary');
const { addAddress, pickAddress } = require('./addressController');

// Atomically reserves stock for each line; rolls back already-reserved lines on failure.
async function reserveStock(lines) {
  const done = [];
  for (const line of lines) {
    const r = await Product.updateOne(
      { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (r.modifiedCount !== 1) {
      await restoreStock(done);
      throw new HttpError(409, `"${line.title}" is out of stock or has fewer items left. Please update your bag.`);
    }
    done.push(line);
  }
}

function restoreStock(lines) {
  return Promise.all(lines.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.quantity } })));
}

// POST /api/orders  { addressId } | { address: {...}, saveAddress? } — COD checkout from the bag.
exports.placeOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(CART_POPULATE);
  const { items, summary } = buildCart(cart);
  if (!items.length) throw new HttpError(400, 'Your bag is empty');

  let address;
  if (req.body.addressId) {
    const saved = req.user.addresses.id(req.body.addressId);
    if (!saved) throw new HttpError(404, 'Address not found');
    address = pickAddress(saved);
  } else {
    address = pickAddress(req.body.address);
  }

  const lines = items.map((i) => ({
    product: i.product._id,
    title: i.product.title,
    image: i.product.image,
    price: i.product.price,
    mrp: i.product.mrp,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
  }));

  await reserveStock(lines);

  let order;
  try {
    order = await Order.create({
      user: req.user._id,
      items: lines,
      address,
      paymentMethod: 'COD',
      itemsTotal: summary.itemsTotal,
      shippingFee: summary.shippingFee,
      totalAmount: summary.total,
      status: 'placed',
      statusHistory: [{ status: 'placed' }],
    });
  } catch (err) {
    await restoreStock(lines);
    throw err;
  }

  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  if (!req.body.addressId && req.body.saveAddress) {
    try {
      addAddress(req.user, address);
      await req.user.save();
    } catch {
      /* address book full: the order still goes through */
    }
  }

  ok(res, { order }, 'Order placed', 201);
});

// GET /api/orders/my?page=
exports.myOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 10;
  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

// GET /api/orders/:id — own orders only (admins may view any).
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  const isOwner = order && String(order.user) === String(req.user._id);
  if (!order || (!isOwner && req.user.role !== 'admin')) throw new HttpError(404, 'Order not found');
  ok(res, { order });
});

// PUT /api/orders/:id/cancel — customers can cancel until the order ships.
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'placed' },
    { $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled' } } },
    { new: true }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id, user: req.user._id });
    throw new HttpError(exists ? 400 : 404, exists ? 'This order can no longer be cancelled' : 'Order not found');
  }
  await restoreStock(order.items);
  ok(res, { order }, 'Order cancelled');
});

// ---------------- admin ----------------

// GET /api/orders?status=&page=  (admin)
exports.listAllOrders = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const filter = req.query.status ? { status: req.query.status } : {};
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email').lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

// PUT /api/orders/:id/status  { status }  (admin) — placed → shipped → delivered; cancel before delivery.
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const current = await Order.findById(req.params.id).select('status');
  if (!current) throw new HttpError(404, 'Order not found');
  if (!TRANSITIONS[current.status].includes(status)) {
    throw new HttpError(400, `Cannot change status from "${current.status}" to "${status}"`);
  }

  // Conditional on the status we just read, so two admins can't double-apply.
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: current.status },
    { $set: { status }, $push: { statusHistory: { status } } },
    { new: true }
  ).populate('user', 'name email');
  if (!order) throw new HttpError(409, 'Order was updated by someone else. Refresh and try again.');

  if (status === 'cancelled') await restoreStock(order.items);
  ok(res, { order }, `Order marked as ${status}`);
});
