const { body } = require('express-validator');

const email = body('email')
  .trim()
  .isEmail()
  .withMessage('Enter a valid email')
  .isLength({ max: 120 })
  .toLowerCase();

const strongPassword = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number');

// No .escape(): React escapes on render; escaping here would store "&#x27;" etc.
const name = body('name')
  .trim()
  .isLength({ min: 2, max: 60 })
  .withMessage('Name must be 2-60 characters');

const phone = body('phone')
  .optional({ values: 'falsy' })
  .trim()
  .matches(/^[6-9]\d{9}$/)
  .withMessage('Enter a valid 10-digit mobile number');

exports.registerRules = [name, email, strongPassword('password'), phone];

exports.loginRules = [
  email,
  body('password').isString().notEmpty().withMessage('Password is required'),
];

exports.changePasswordRules = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword'),
];

exports.profileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  phone,
  body('avatar').optional({ values: 'falsy' }).trim().isURL({ protocols: ['https'] }).withMessage('Avatar must be an https URL'),
];

exports.createChatuserRules = [name, email, strongPassword('password')];

exports.userStatusRules = [body('isActive').isBoolean().withMessage('isActive must be true or false').toBoolean()];
