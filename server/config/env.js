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
  // Audio/video calls: which ICE (STUN/TURN) servers the browsers get. See README "Calls".
  turn: {
    provider: (process.env.TURN_PROVIDER || 'none').trim().toLowerCase(),
    urls: (process.env.TURN_URLS || '').split(',').map((s) => s.trim()).filter(Boolean),
    username: process.env.TURN_USERNAME || '',
    credential: process.env.TURN_CREDENTIAL || '',
    sharedSecret: process.env.TURN_SHARED_SECRET || '',
    cloudflareKeyId: process.env.TURN_KEY_ID || '',
    cloudflareToken: process.env.TURN_KEY_API_TOKEN || '',
    meteredApiKey: process.env.METERED_API_KEY || '',
    meteredAppName: (process.env.METERED_APP_NAME || '').trim().replace(/\.metered\.live$/i, ''),
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

// Calls: check the TURN settings for the chosen provider (values themselves are never printed).
{
  const t = env.turn;
  const needs = {
    none: [],
    static: [['TURN_URLS', t.urls.length], ['TURN_USERNAME', t.username], ['TURN_CREDENTIAL', t.credential]],
    'coturn-secret': [['TURN_URLS', t.urls.length], ['TURN_SHARED_SECRET', t.sharedSecret]],
    cloudflare: [['TURN_KEY_ID', t.cloudflareKeyId], ['TURN_KEY_API_TOKEN', t.cloudflareToken]],
    metered: [['METERED_API_KEY', t.meteredApiKey], ['METERED_APP_NAME', t.meteredAppName]],
  };
  if (!needs[t.provider]) {
    console.warn(`Warning: TURN_PROVIDER "${t.provider}" is not recognised. Using STUN only (none, static, coturn-secret, cloudflare, metered are valid).`);
    t.provider = 'none';
  }
  const missingTurn = needs[t.provider].filter(([, v]) => !v).map(([k]) => k);
  if (missingTurn.length) {
    console.warn(`Warning: TURN_PROVIDER=${t.provider} but ${missingTurn.join(', ')} not set. Calls will use STUN only.`);
    t.provider = 'none';
  }
  if (t.provider === 'none') {
    console.warn('Warning: TURN_PROVIDER=none (STUN only). Calls may fail on some mobile or strict networks. See README "Calls".');
  }
}

module.exports = env;
