const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');

const MAX_ADDRESSES = 10;
const FIELDS = ['fullName', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'];
const pickAddress = (src) => Object.fromEntries(FIELDS.map((f) => [f, src?.[f] ?? '']));

// Keeps exactly one default when any addresses exist.
function normaliseDefault(user, preferredId) {
  if (!user.addresses.length) return;
  if (preferredId) {
    user.addresses.forEach((a) => {
      a.isDefault = String(a._id) === String(preferredId);
    });
  } else if (!user.addresses.some((a) => a.isDefault)) {
    user.addresses[0].isDefault = true;
  }
}

// Adds an address to a loaded user document (also used by checkout).
function addAddress(user, data, makeDefault = false) {
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  }
  user.addresses.push({ ...pickAddress(data), isDefault: false });
  const added = user.addresses[user.addresses.length - 1];
  normaliseDefault(user, makeDefault || user.addresses.length === 1 ? added._id : null);
  return added;
}

// GET /api/users/addresses
exports.listAddresses = (req, res) => ok(res, { addresses: req.user.addresses });

// POST /api/users/addresses
exports.createAddress = asyncHandler(async (req, res) => {
  addAddress(req.user, req.body, req.body.isDefault);
  await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address saved', 201);
});

// PUT /api/users/addresses/:id
exports.updateAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw new HttpError(404, 'Address not found');
  Object.assign(addr, pickAddress(req.body));
  normaliseDefault(req.user, req.body.isDefault ? addr._id : null);
  await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address updated');
});

// DELETE /api/users/addresses/:id
exports.deleteAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw new HttpError(404, 'Address not found');
  addr.deleteOne();
  normaliseDefault(req.user);
  await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address deleted');
});

exports.addAddress = addAddress;
exports.pickAddress = pickAddress;
