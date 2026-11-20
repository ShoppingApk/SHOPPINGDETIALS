const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  quantity: { type: Number, default: 1, min: 1, max: 10 },
});

// One cart per user, created on first use.
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

cartSchema.statics.forUser = async function forUser(userId) {
  return this.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true });
};

module.exports = mongoose.model('Cart', cartSchema);
