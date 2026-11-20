const multer = require('multer');
const HttpError = require('../utils/httpError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Files stay in memory and are streamed to Cloudinary (Render's disk is ephemeral).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed')),
});

// Private messages: one image, max 5 MB, JPG/PNG/WEBP only.
const CHAT_ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    CHAT_ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG or WEBP images are allowed')),
});

// Accepts up to 5 files in the "images" field. JSON requests pass straight through.
module.exports = { productImages: upload.array('images', 5), chatImage: chatUpload.single('image') };
