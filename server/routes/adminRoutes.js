const router = require('express').Router();
const { param, query } = require('express-validator');
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createChatuserRules, userStatusRules } = require('../validators/authValidators');
const { CATEGORIES } = require('../models/Product');

// Every admin route requires a logged-in admin.
router.use(protect, authorize('admin'));

const page = query('page').optional().isInt({ min: 1, max: 1000 }).toInt();
const q = query('q').optional().isString().isLength({ max: 60 });

router.get('/config', ctrl.config);
router.get('/stats', ctrl.stats);

router.get(
  '/products',
  q,
  page,
  query('category').optional({ values: 'falsy' }).isIn(CATEGORIES),
  query('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']),
  query('lowStock').optional({ values: 'falsy' }).isIn(['1', 'true']),
  validate,
  ctrl.listProducts
);

router.get(
  '/users',
  q,
  page,
  query('role').optional({ values: 'falsy' }).isIn(['user', 'chatuser', 'admin']).withMessage('Unknown role'),
  query('status').optional({ values: 'falsy' }).isIn(['active', 'disabled']),
  validate,
  ctrl.listUsers
);
router.post('/chatusers', createChatuserRules, validate, ctrl.createChatuser);
router.patch('/users/:id/status', param('id').isMongoId().withMessage('Invalid user id'), userStatusRules, validate, ctrl.setUserStatus);

module.exports = router;
