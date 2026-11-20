// Loads and validates environment variables once, so the rest of the app can rely on them.
const path = require('path');
// Always load server/.env, regardless of the folder the command is run from.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}. Copy server/.env.example to server/.env and fill them in.`);
  process.exit(1);
}
if (process.env.MONGO_URI.includes('<')) {
  console.error('MONGO_URI in server/.env still has placeholder values. Paste your MongoDB Atlas connection string.');
  process.exit(1);
}

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  chatUnlockKeyword: process.env.CHAT_UNLOCK_KEYWORD || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};

// Refuse to run in production with weak or missing critical settings.
if (env.isProd) {
  const problems = [];
  if (env.jwtSecret.length < 32 || /change_me/i.test(env.jwtSecret)) problems.push('JWT_SECRET must be a random string of at least 32 characters');
  if (!process.env.CLIENT_URL) problems.push('CLIENT_URL must be set to your frontend URL');
  if (problems.length) {
    console.error(`Refusing to start in production:\n - ${problems.join('\n - ')}`);
    process.exit(1);
  }
}

// Private messaging needs these; shopping works without them, so warn instead of exiting.
if (!/^[0-9a-fA-F]{64}$/.test(env.encryptionKey)) {
  console.warn('Warning: ENCRYPTION_KEY is missing or not 64 hex characters. Private messages cannot be sent until it is set.');
}
if (!env.chatUnlockKeyword) {
  console.warn('Warning: CHAT_UNLOCK_KEYWORD is not set. Keyword unlock is disabled.');
}

module.exports = env;
