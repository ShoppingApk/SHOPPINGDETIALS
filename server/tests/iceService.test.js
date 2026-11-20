// Unit tests for ICE/TURN helpers. Run: npm test (in server/)
process.env.MONGO_URI ||= 'mongodb://localhost/test';
process.env.JWT_SECRET ||= 'test-secret';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { coturnCredentials, clean, usableUrl } = require('../services/iceService');

test('coturn-secret credentials follow the TURN REST API scheme', () => {
  const now = Date.UTC(2026, 0, 1);
  const { username, credential } = coturnCredentials('s3cret', 'label', now, 3600);
  assert.equal(username, `${now / 1000 + 3600}:label`);
  assert.equal(credential, crypto.createHmac('sha1', 's3cret').update(username).digest('base64'));
});

test('port 53 and non-ICE URLs are dropped', () => {
  assert.equal(usableUrl('turn:turn.example.com:53?transport=udp'), false);
  assert.equal(usableUrl('turn:turn.example.com:53'), false);
  assert.equal(usableUrl('turn:turn.example.com:5349'), true);
  assert.equal(usableUrl('turns:turn.example.com:443?transport=tcp'), true);
  assert.equal(usableUrl('https://evil.example'), false);
});

test('clean() keeps only usable servers and plain fields', () => {
  const out = clean([
    { urls: ['turn:a:53?transport=udp', 'turn:a:3478?transport=udp'], username: 'u', credential: 'c', extra: 'x' },
    { urls: 'stun:b:3478' },
    { urls: ['turn:c:53'] },
    null,
  ]);
  assert.deepEqual(out, [
    { urls: ['turn:a:3478?transport=udp'], username: 'u', credential: 'c' },
    { urls: ['stun:b:3478'] },
  ]);
});
