const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { productImages } = require('../middleware/upload');
const v = require('../validators/shopValidators');

const admin = [protect, authorize('admin')];

// Public catalogue (browsing doesn't need login). Fixed paths before "/:id".
router.get('/', v.listProductsRules, validate, ctrl.listProducts);
router.get('/categories', ctrl.getCategories);
router.get('/filters', ctrl.getFilters);
router.get('/:id', v.idParam, validate, ctrl.getProduct);
router.get('/:id/similar', v.idParam, validate, ctrl.getSimilar);

// Reviews
router.get('/:id/reviews', v.idParam, validate, ctrl.listReviews);
router.post('/:id/reviews', protect, v.reviewRules, validate, ctrl.addReview);

// Admin CRUD. multer runs first so multipart text fields are in req.body for validation.
router.post('/', ...admin, productImages, v.createProductRules, validate, ctrl.createProduct);
router.put('/:id', ...admin, productImages, v.updateProductRules, validate, ctrl.updateProduct);
router.delete('/:id', ...admin, v.idParam, validate, ctrl.deleteProduct);

module.exports = router;
