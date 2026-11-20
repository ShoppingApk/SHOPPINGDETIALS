const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const { sendAuth, clearAuthCookie } = require('../utils/token');

// POST /api/auth/register  — public sign-up always creates a normal "user".
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, phone, role: 'user' });
  sendAuth(res, user, 201, 'Account created');
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for unknown email and wrong password (prevents account enumeration).
  if (!user || !(await user.matchPassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new HttpError(403, 'This account has been disabled');

  sendAuth(res, user);
});

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearAuthCookie(res);
  ok(res, null, 'Logged out');
};

// GET /api/auth/me
exports.me = (req, res) => ok(res, { user: req.user.toPublic() });

// PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  sendAuth(res, user, 200, 'Password changed');
});
