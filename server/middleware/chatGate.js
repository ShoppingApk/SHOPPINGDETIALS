const User = require('../models/User');
const { verifyToken, extractToken, isTokenStale } = require('../utils/token');
const { notFound } = require('./errorHandler');

// chatOnly: the request must come from an authenticated, active user with role "chatuser".
// Everyone else (guests, users, admins, expired or invalid tokens, disabled accounts) gets
// exactly the same 404 response as an unknown route, so the feature can't be discovered.
module.exports = async function chatOnly(req, res, next) {
  try {
    const token = extractToken({ authorization: req.headers.authorization, cookies: req.cookies });
    if (!token) return notFound(req, res);
    const payload = verifyToken(token);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive || user.role !== 'chatuser' || isTokenStale(user, payload)) return notFound(req, res);
    req.user = user;
    return next();
  } catch {
    return notFound(req, res);
  }
};
