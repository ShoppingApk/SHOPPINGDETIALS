// Seeds the database. Safe to re-run.
// Usage: npm run seed
//
// 1. Replaces all products with the 48-product sample catalogue.
// 2. Removes reviews, bag items and wishlist entries (they point at old product ids).
// 3. Creates an admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet.
// Users and orders are kept (orders store their own product snapshot).
const mongoose = require('mongoose');
const env = require('./config/env');
const Product = require('./models/Product');
const Review = require('./models/Review');
const Cart = require('./models/Cart');
const Wishlist = require('./models/Wishlist');
const User = require('./models/User');
const { buildProducts } = require('./data/products');

async function ensureAdmin() {
  if (await User.exists({ role: 'admin' })) return 'an admin already exists (skipped)';

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 8) return 'no admin created: set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env';

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.isActive = true;
    await existing.save();
    return `promoted existing account ${email} to admin`;
  }
  await User.create({ name: process.env.ADMIN_NAME || 'Store Admin', email, password, role: 'admin' });
  return `created admin ${email}`;
}

(async () => {
  await mongoose.connect(env.mongoUri);

  const [removed] = await Promise.all([
    Product.deleteMany({}),
    Review.deleteMany({}),
    Cart.updateMany({}, { $set: { items: [] } }),
    Wishlist.updateMany({}, { $set: { products: [] } }),
    // Clean up fields from the earlier schema where cart/wishlist lived on the user.
    User.collection.updateMany({}, { $unset: { cart: '', wishlist: '' } }),
  ]);
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} old products, all reviews, bag and wishlist items.`);

  // create() (not insertMany) so the pre-save hook computes discountPercent.
  const products = await Product.create(buildProducts());
  await Promise.all([Product.syncIndexes(), Review.syncIndexes(), Cart.syncIndexes(), Wishlist.syncIndexes()]);

  const byCat = products.reduce((m, p) => ({ ...m, [p.category]: (m[p.category] || 0) + 1 }), {});
  console.log(`Inserted ${products.length} products:`, byCat);
  console.log(`Admin: ${await ensureAdmin()}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
