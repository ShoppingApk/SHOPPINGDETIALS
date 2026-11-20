const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/shopValidators');

router.use(protect);

// Customer
router.post('/', v.placeOrderRules, validate, ctrl.placeOrder);
router.get('/my', ctrl.myOrders);

// Admin
router.get('/', authorize('admin'), v.listOrdersRules, validate, ctrl.listAllOrders);
router.put('/:id/status', authorize('admin'), v.orderStatusRules, validate, ctrl.updateStatus);

// Customer (by id) — after fixed paths
router.get('/:id', v.idParam, validate, ctrl.getOrder);
router.put('/:id/cancel', v.idParam, validate, ctrl.cancelOrder);

module.exports = router;
