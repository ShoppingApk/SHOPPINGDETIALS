const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

// PUT /api/users/profile — update own name/phone/avatar.
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  ok(res, { user: req.user.toPublic() }, 'Profile updated');
});
