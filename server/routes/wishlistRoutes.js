const router = require('express').Router();
const ctrl = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { productIdParam } = require('../validators/shopValidators');

router.use(protect);

router.get('/', ctrl.getWishlist);
router.post('/:productId', productIdParam, validate, ctrl.toggleWishlist);

module.exports = router;
