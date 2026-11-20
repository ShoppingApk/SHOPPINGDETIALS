const router = require('express').Router();
const ctrl = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addToCartRules, updateCartRules, itemIdParam } = require('../validators/shopValidators');

router.use(protect);

router.get('/', ctrl.getCart);
router.post('/', addToCartRules, validate, ctrl.addToCart);
router.patch('/:itemId', updateCartRules, validate, ctrl.updateCartItem);
router.delete('/:itemId', itemIdParam, validate, ctrl.removeCartItem);
router.delete('/', ctrl.clearCart);

module.exports = router;
