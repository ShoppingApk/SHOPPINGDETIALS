const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per user per product.
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

// Recomputes product.rating / numReviews from the baseline + all real reviews.
reviewSchema.statics.recalculate = async function recalculate(productId) {
  const Product = mongoose.model('Product');
  const [agg] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, sum: { $sum: '$rating' }, count: { $sum: 1 } } },
  ]);
  const product = await Product.findById(productId).select('+baseRating +baseReviews');
  if (!product) return null;

  const sum = (agg?.sum || 0) + product.baseRating * product.baseReviews;
  const count = (agg?.count || 0) + product.baseReviews;
  product.rating = count ? Math.round((sum / count) * 10) / 10 : 0;
  product.numReviews = count;
  await product.save();
  return { rating: product.rating, numReviews: product.numReviews };
};

module.exports = mongoose.model('Review', reviewSchema);
