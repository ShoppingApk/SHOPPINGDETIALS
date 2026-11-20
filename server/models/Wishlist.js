const mongoose = require('mongoose');

// One wishlist per user, created on first use.
const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
