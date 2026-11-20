const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/chatController');
const chatOnly = require('../middleware/chatGate');
const validate = require('../middleware/validate');
const { chatImage } = require('../middleware/upload');

// Everything below is invisible (plain 404) unless the caller is an active chatuser.
router.use(chatOnly);

// Keyword guesses: 10 per 5 minutes per account.
const unlockLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', data: null },
});

const id = (name) => param(name).isMongoId().withMessage('Not found');

router.post('/unlock', unlockLimiter, body('keyword').isString().isLength({ max: 100 }), validate, ctrl.unlock);
router.get('/config', ctrl.config);
router.get('/users', query('q').optional().isString().isLength({ max: 50 }), validate, ctrl.searchUsers);
router.get('/conversations', ctrl.listConversations);
router.post('/conversations', body('userId').isMongoId().withMessage('Choose a user'), validate, ctrl.openConversation);
router.get(
  '/conversations/:id/messages',
  id('id'),
  query('before').optional().isMongoId().withMessage('Invalid cursor'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validate,
  ctrl.listMessages
);
router.post('/upload', chatImage, ctrl.upload);
router.delete(
  '/messages/:id',
  id('id'),
  query('scope').optional().isIn(['me', 'everyone']).withMessage('scope must be "me" or "everyone"'),
  validate,
  ctrl.deleteMessage
);

module.exports = router;
