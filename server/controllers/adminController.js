const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const cloud = require('../config/cloudinary');

const escapeRx = (s) => String(s).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/config — what the admin UI can offer.
exports.config = (req, res) => ok(res, { imageUpload: cloud.isConfigured, maxImages: 5, maxImageMB: 2 });

// GET /api/admin/stats — dashboard numbers.
exports.stats = asyncHandler(async (req, res) => {
  const [usersByRole, products, inactive, lowStock, ordersByStatus, revenue, recentOrders] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    Product.countDocuments(),
    Product.countDocuments({ isActive: false }),
    Product.find({ isActive: true, stock: { $lt: 10 } }).select('title stock images').sort({ stock: 1 }).limit(8).lean(),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name email').lean(),
  ]);
  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.n]));
  const orders = toMap(ordersByStatus);
  ok(res, {
    users: { user: 0, chatuser: 0, admin: 0, ...toMap(usersByRole) },
    products: { total: products, inactive, lowStock },
    orders: { total: Object.values(orders).reduce((a, b) => a + b, 0), placed: 0, shipped: 0, delivered: 0, cancelled: 0, ...orders },
    revenue: revenue[0]?.total || 0,
    recentOrders,
  });
});

// GET /api/admin/products?q=&category=&status=active|inactive&lowStock=1&page=
// Unlike the public list, this includes hidden products and every field.
exports.listProducts = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.lowStock) filter.stock = { $lt: 10 };
  if (req.query.q) {
    const rx = new RegExp(escapeRx(req.query.q), 'i');
    filter.$or = [{ title: rx }, { brand: rx }, { subCategory: rx }];
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

const adminView = (u) => ({ ...u.toPublic(), isActive: u.isActive });

// GET /api/admin/users?role=&q=&page=
exports.listUsers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'disabled') filter.isActive = false;
  if (req.query.q) {
    const rx = new RegExp(escapeRx(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  ok(res, { users: users.map(adminView), page, pages: Math.ceil(total / limit) || 1, total });
});

// POST /api/admin/chatusers — admin sets email + temporary password.
exports.createChatuser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, role: 'chatuser', mustChangePassword: true });
  ok(res, { user: adminView(user) }, 'User created', 201);
});

// PATCH /api/admin/users/:id/status  { isActive: boolean }
exports.setUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'admin') throw new HttpError(400, 'Admin accounts cannot be disabled here');

  user.isActive = req.body.isActive;
  await user.save();
  // Disabled accounts lose any live connections immediately.
  if (!user.isActive) require('../socket/registry').disconnectUser(user._id);
  ok(res, { user: adminView(user) }, user.isActive ? 'User enabled' : 'User disabled');
});
