const env = require('../config/env');

const fail = (res, status, message, data = null) => res.status(status).json({ success: false, message, data });

function notFound(req, res) {
  fail(res, 404, 'Not found');
}

// Central error handler: converts any thrown error into { success: false, message, data }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let data = err.details || null;

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.name === 'ValidationError') {
    status = 422;
    data = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = data[0]?.message || 'Invalid data';
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`;
  } else if (err.name === 'MulterError') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE' ? `Each image must be ${err.field === 'image' ? 5 : 2} MB or smaller`
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'You can upload up to 5 images in the "images" field'
      : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (message === 'Not allowed by CORS') {
    status = 403;
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = 'Something went wrong';
  }

  fail(res, status, message, data);
}

module.exports = { notFound, errorHandler, fail };
