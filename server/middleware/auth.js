const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { verifyToken, extractToken, isTokenStale } = require('../utils/token');

// Requires a valid, current JWT and an active account. Attaches req.user.
async function protect(req, res, next) {
  try {
    const token = extractToken({ authorization: req.headers.authorization, cookies: req.cookies });
    if (!token) throw new HttpError(401, 'Please log in to continue');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new HttpError(401, 'Session expired. Please log in again');
    }

    const user = await User.findById(payload.id);
    if (!user) throw new HttpError(401, 'Account not found');
    if (isTokenStale(user, payload)) throw new HttpError(401, 'Your password was changed. Please log in again');
    // 401 (not 403) so clients drop the session and sign the user out everywhere.
    if (!user.isActive) throw new HttpError(401, 'This account has been disabled');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Allows only the listed roles. Responds 403 (the route exists, you just can't use it).
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to do this'));
    }
    next();
  };
}

// Private messaging uses middleware/chatGate.js (plain 404 for everyone else).
module.exports = { protect, authorize };
