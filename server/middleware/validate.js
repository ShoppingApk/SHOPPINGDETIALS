const { validationResult } = require('express-validator');
const HttpError = require('../utils/httpError');

// Runs after express-validator chains; returns 422 with field errors in `data`:
// { success: false, message: "<first error>", data: [{ field, message }] }
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new HttpError(422, errors[0].message, errors));
};
