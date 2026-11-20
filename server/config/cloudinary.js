const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

const { cloudName, apiKey, apiSecret } = env.cloudinary;
const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

// Uploads an in-memory file buffer. Resolves to { url, publicId }.
function uploadBuffer(buffer, folder = 'kaasni/products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
}

// Best-effort delete; never throws (a missing remote image shouldn't block DB changes).
async function destroy(publicIds = []) {
  if (!isConfigured) return;
  await Promise.all(publicIds.filter(Boolean).map((id) => cloudinary.uploader.destroy(id).catch(() => null)));
}

module.exports = { isConfigured, uploadBuffer, destroy };
