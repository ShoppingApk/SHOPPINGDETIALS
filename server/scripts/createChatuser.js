// Creates a user with role "chatuser" (or converts an existing account).
// Usage: npm run create-chatuser -- <email> <password> <name...>
// The user is asked to change this password after logging in.
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const [emailArg, password, ...nameParts] = process.argv.slice(2);
const email = (emailArg || '').trim().toLowerCase();
const name = nameParts.join(' ').trim();

function usage(msg) {
  console.error(`${msg}\nUsage: npm run create-chatuser -- <email> <password> <name>`);
  console.error('Example: npm run create-chatuser -- asha@example.com Temp1234 Asha Verma');
  process.exit(1);
}

if (!/^\S+@\S+\.\S+$/.test(email)) usage('Enter a valid email.');
if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  usage('Password must be at least 8 characters with a letter and a number.');
}
if (name.length < 2) usage('Enter a name (at least 2 characters).');

(async () => {
  await mongoose.connect(env.mongoUri);
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === 'admin') {
      console.error(`${email} is an admin account; it was not changed.`);
      process.exit(1);
    }
    existing.role = 'chatuser';
    existing.name = name;
    existing.password = password;
    existing.isActive = true;
    existing.mustChangePassword = true;
    await existing.save();
    console.log(`Updated ${email}: role chatuser, password reset.`);
  } else {
    await User.create({ name, email, password, role: 'chatuser', mustChangePassword: true });
    console.log(`Created chatuser ${email}.`);
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
