const mongoose = require('mongoose');

const CATEGORIES = ['Women', 'Men', 'Kids', 'Home', 'Beauty', 'Electronics'];

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 3000 },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    subCategory: { type: String, default: '', trim: true, maxlength: 60 },
    brand: { type: String, default: '', trim: true, maxlength: 60, index: true },
    price: { type: Number, required: true, min: 0 }, // selling price (INR)
    mrp: { type: Number, required: true, min: 0 }, // original price (INR)
    discountPercent: { type: Number, default: 0, min: 0, max: 100 }, // auto-calculated
    images: [
      {
        _id: false,
        url: { type: String, required: true },
        publicId: { type: String, default: '' }, // Cloudinary id; empty for plain URLs
      },
    ],
    sizes: [{ type: String, trim: true }],
    colors: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    stock: { type: Number, default: 0, min: 0 },

    // Shown rating = blend of the baseline (seeded/imported) and real reviews.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    baseRating: { type: Number, default: 0, min: 0, max: 5, select: false },
    baseReviews: { type: Number, default: 0, min: 0, select: false },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

productSchema.methods.computeDiscount = function computeDiscount() {
  this.discountPercent = this.mrp > 0 && this.price <= this.mrp ? Math.round(((this.mrp - this.price) / this.mrp) * 100) : 0;
};

productSchema.pre('validate', function checkPrice(next) {
  if (this.price > this.mrp) this.invalidate('price', 'Price cannot be more than MRP');
  next();
});

productSchema.pre('save', function beforeSave(next) {
  if (this.isModified('price') || this.isModified('mrp') || this.isNew) this.computeDiscount();
  next();
});

productSchema.index({ title: 'text', description: 'text', brand: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
module.exports.CATEGORIES = CATEGORIES;
