const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['user', 'chatuser', 'admin'];

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    pincode: { type: String, required: true, trim: true, match: /^\d{6}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    phone: { type: String, trim: true, maxlength: 15 },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    // Set when an admin creates the account with a temporary password.
    mustChangePassword: { type: Boolean, default: false },
    // Tokens issued before this moment are rejected (set on every password change).
    passwordChangedAt: { type: Date },

    // Saved delivery addresses (cart and wishlist live in their own collections).
    addresses: [addressSchema],

    // Presence info for chatusers (maintained by the socket layer in Phase 4).
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  // 1 s back-dated so the token issued right after this change (same second) stays valid.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// Shape sent to the client. Never includes the password or presence data.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone || '',
    avatar: this.avatar,
    mustChangePassword: this.mustChangePassword,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
