const { body, param, query } = require('express-validator');
const { CATEGORIES } = require('../models/Product');
const { ORDER_STATUS } = require('../models/Order');

const mongoId = (field, where = param) => where(field).isMongoId().withMessage(`Invalid ${field}`);

exports.idParam = [mongoId('id')];
exports.productIdParam = [mongoId('productId')];
exports.itemIdParam = [mongoId('itemId')];

// Accepts an array, a JSON array string, or a comma-separated string (multipart forms send text).
const toList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  const str = String(value).trim();
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {
      /* fall through to comma split */
    }
  }
  return str.split(',').map((s) => s.trim()).filter(Boolean);
};

const listField = (name, { max = 15, itemMax = 30 } = {}) =>
  body(name)
    .optional()
    .customSanitizer(toList)
    .custom((arr) => arr.length <= max && arr.every((s) => s.length <= itemMax))
    .withMessage(`${name}: up to ${max} items, each at most ${itemMax} characters`);

// ---------- products ----------

exports.listProductsRules = [
  query('q').optional().isString().trim().isLength({ max: 80 }).withMessage('Search is too long'),
  query('category').optional({ values: 'falsy' }).isIn(CATEGORIES).withMessage('Unknown category'),
  query('brand').optional({ values: 'falsy' }).isString().isLength({ max: 200 }),
  query('size').optional({ values: 'falsy' }).isString().isLength({ max: 20 }),
  query('minPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('minPrice must be a number').toFloat(),
  query('maxPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('maxPrice must be a number').toFloat(),
  query('minRating').optional({ values: 'falsy' }).isFloat({ min: 0, max: 5 }).toFloat(),
  query('sort')
    .optional()
    .isIn(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'discount'])
    .withMessage('sort must be one of: relevance, newest, price_asc, price_desc, rating, discount'),
  query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1-50').toInt(),
];

const productFields = (optional) => {
  const req = (chain) => (optional ? chain.optional() : chain);
  return [
    req(body('title')).isString().trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters'),
    body('description').optional().isString().trim().isLength({ max: 3000 }),
    req(body('category')).isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('subCategory').optional().isString().trim().isLength({ max: 60 }),
    body('brand').optional().isString().trim().isLength({ max: 60 }),
    req(body('price')).isFloat({ min: 0 }).withMessage('Price must be a positive number').toFloat(),
    req(body('mrp')).isFloat({ min: 0 }).withMessage('MRP must be a positive number').toFloat(),
    body('mrp')
      .optional()
      .custom((mrp, { req: r }) => r.body.price === undefined || Number(r.body.price) <= Number(mrp))
      .withMessage('Price cannot be more than MRP'),
    req(body('stock')).isInt({ min: 0 }).withMessage('Stock must be 0 or more').toInt(),
    body('isActive').optional().isBoolean().toBoolean(),
    listField('sizes', { itemMax: 20 }),
    listField('colors', { itemMax: 30 }),
    listField('tags', { max: 20, itemMax: 30 }),
    listField('imageUrls', { max: 5, itemMax: 500 })
      .bail()
      .custom((arr) => arr.every((u) => /^https?:\/\/\S+$/i.test(u)))
      .withMessage('imageUrls must be http(s) links'),
  ];
};

exports.createProductRules = productFields(false);
exports.updateProductRules = [
  mongoId('id'),
  ...productFields(true),
  // Existing image URLs to keep on update; omit to keep all current images.
  listField('keepImages', { max: 5, itemMax: 500 }),
];

exports.reviewRules = [
  mongoId('id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5').toInt(),
  body('comment').optional().isString().trim().isLength({ max: 1000 }).withMessage('Comment is too long'),
];

// ---------- cart ----------

exports.addToCartRules = [
  mongoId('productId', body),
  body('size').optional().isString().trim().isLength({ max: 20 }),
  body('color').optional().isString().trim().isLength({ max: 30 }),
  body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1-10').toInt(),
];

exports.updateCartRules = [
  mongoId('itemId'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1-10').toInt(),
];

// ---------- addresses / orders ----------

// `when` is an optional factory returning a condition chain. It is applied FIRST in each
// chain because express-validator's .if() only gates the validators that come after it.
const addressFields = (prefix = '', when = null) => {
  const f = (name) => (when ? body(`${prefix}${name}`).if(when()) : body(`${prefix}${name}`));
  return [
    f('fullName').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the full name'),
    f('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
    f('line1').trim().isLength({ min: 3, max: 200 }).withMessage('Enter house no. / building / street'),
    f('line2').optional().trim().isLength({ max: 200 }),
    f('city').trim().isLength({ min: 2, max: 60 }).withMessage('Enter the city'),
    f('state').trim().isLength({ min: 2, max: 60 }).withMessage('Enter the state'),
    f('pincode').trim().matches(/^\d{6}$/).withMessage('Enter a valid 6-digit pincode'),
  ];
};

exports.addressRules = [...addressFields(), body('isDefault').optional().isBoolean().toBoolean()];
exports.updateAddressRules = [mongoId('id'), ...exports.addressRules];

// Checkout: either pick a saved address (addressId) or send a new one (address.*).
exports.placeOrderRules = [
  body('paymentMethod').optional().equals('COD').withMessage('Only Cash on Delivery (COD) is available'),
  body('addressId').optional().isMongoId().withMessage('Invalid address'),
  body('saveAddress').optional().isBoolean().toBoolean(),
  body('address').if(body('addressId').not().exists()).isObject().withMessage('Choose or enter a delivery address'),
  ...addressFields('address.', () => body('addressId').not().exists()),
];

exports.listOrdersRules = [
  query('status').optional({ values: 'falsy' }).isIn(ORDER_STATUS).withMessage('Unknown status'),
  query('page').optional().isInt({ min: 1 }).toInt(),
];

exports.orderStatusRules = [
  mongoId('id'),
  body('status').isIn(ORDER_STATUS).withMessage(`Status must be one of: ${ORDER_STATUS.join(', ')}`),
];
