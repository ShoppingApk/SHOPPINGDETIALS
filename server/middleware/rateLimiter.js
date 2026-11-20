const rateLimit = require('express-rate-limit');

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message, data: null },
  });

// Login/register: 20 attempts per 15 minutes per IP.
const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.');

// General API safety net.
const apiLimiter = limiter(60 * 1000, 300, 'Too many requests. Please slow down.');

module.exports = { authLimiter, apiLimiter };
