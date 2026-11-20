// Creates (or promotes) the first admin from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in .env.
// Usage: npm run create-admin
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

(async () => {
  const name = process.env.ADMIN_NAME || 'Store Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || password.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in server/.env first.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  let user = await User.findOne({ email });

  if (user) {
    user.role = 'admin';
    user.isActive = true;
    user.password = password;
    await user.save();
    console.log(`Existing account ${email} is now an admin (password reset to ADMIN_PASSWORD).`);
  } else {
    user = await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
