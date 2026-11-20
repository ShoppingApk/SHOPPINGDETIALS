const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, changePasswordRules } = require('../validators/authValidators');

router.post('/register', authLimiter, registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);
router.put('/password', authLimiter, protect, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
