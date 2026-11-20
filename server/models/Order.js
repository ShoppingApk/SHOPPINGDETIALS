const mongoose = require('mongoose');

const ORDER_STATUS = ['placed', 'shipped', 'delivered', 'cancelled'];

// Allowed admin status changes.
const TRANSITIONS = {
  placed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot of product data at purchase time, so later edits don't change history.
    title: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    address: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
    itemsTotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUS, default: 'placed', index: true },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUS = ORDER_STATUS;
module.exports.TRANSITIONS = TRANSITIONS;
