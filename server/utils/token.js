const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';

function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// Cross-site (Vercel -> Render) cookies need SameSite=None + Secure in production.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

// Sets the httpOnly cookie and also returns the token so the client can send it as a
// Bearer header. The header is the reliable path when browsers block third-party cookies.
function sendAuth(res, user, status = 200, message = 'Logged in') {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return res.status(status).json({ success: true, message, data: { token, user: user.toPublic() } });
}

function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}

// Pulls a JWT from an Authorization header or a cookie header string.
function extractToken({ authorization, cookies }) {
  if (authorization && authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  if (cookies && cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  return null;
}

// True when the token was issued before the user's last password change (e.g. stolen or
// old sessions after a reset), so it must no longer be accepted.
function isTokenStale(user, payload) {
  return Boolean(user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime());
}

module.exports = { signToken, verifyToken, sendAuth, clearAuthCookie, extractToken, isTokenStale, COOKIE_NAME };
