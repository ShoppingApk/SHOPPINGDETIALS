// Every successful response uses the same envelope: { success, message, data }.
// Errors use the same shape via middleware/errorHandler.js.
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

module.exports = { ok };
