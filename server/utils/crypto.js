// AES-256-GCM encryption for message text at rest.
// encrypt() returns { iv, tag, data } (base64). The 12-byte IV is random per message and the
// GCM auth tag makes tampering detectable.
const crypto = require('crypto');
const env = require('../config/env');

const ALGO = 'aes-256-gcm';
let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  if (!/^[0-9a-fA-F]{64}$/.test(env.encryptionKey)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  cachedKey = Buffer.from(env.encryptionKey, 'hex');
  return cachedKey;
}

const isKeyValid = () => /^[0-9a-fA-F]{64}$/.test(env.encryptionKey);

function encrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return undefined;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function decrypt(enc) {
  if (!enc || !enc.data) return '';
  try {
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(enc.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(enc.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(enc.data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '[message could not be decrypted]';
  }
}

// Constant-time string comparison (hashing first makes lengths equal).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = { encrypt, decrypt, safeEqual, isKeyValid };
