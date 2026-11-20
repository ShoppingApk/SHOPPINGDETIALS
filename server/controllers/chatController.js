const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { ok } = require('../utils/respond');
const { safeEqual } = require('../utils/crypto');
const env = require('../config/env');
const cloud = require('../config/cloudinary');
const chat = require('../services/chatService');

// POST /api/chat/unlock { keyword }
// Non-chatusers never reach this (chatOnly answers 404). For chatusers the answer is
// { unlocked: true|false }: a 200 either way, so their ordinary searches don't put
// "404" errors in the browser console.
exports.unlock = (req, res) => {
  const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword.trim() : '';
  const unlocked = Boolean(env.chatUnlockKeyword && keyword && safeEqual(keyword, env.chatUnlockKeyword));
  return ok(res, { unlocked });
};

// GET /api/chat/config — feature flags for the UI.
exports.config = (req, res) => ok(res, { images: cloud.isConfigured, maxTextLength: chat.MAX_TEXT, maxImageMB: 5 });

// GET /api/chat/users?q=
exports.searchUsers = asyncHandler(async (req, res) => {
  ok(res, { users: await chat.searchUsers(req.user._id, req.query.q) });
});

// GET /api/chat/conversations
exports.listConversations = asyncHandler(async (req, res) => {
  ok(res, { conversations: await chat.listConversations(req.user._id) });
});

// POST /api/chat/conversations { userId }
exports.openConversation = asyncHandler(async (req, res) => {
  ok(res, { conversation: await chat.getOrCreateConversation(req.user._id, req.body.userId) });
});

// GET /api/chat/conversations/:id/messages?before=&limit=
exports.listMessages = asyncHandler(async (req, res) => {
  ok(res, await chat.listMessages(req.user._id, req.params.id, { before: req.query.before, limit: req.query.limit }));
});

// POST /api/chat/upload (multipart "image")
exports.upload = asyncHandler(async (req, res) => {
  if (!cloud.isConfigured) throw new HttpError(400, 'Image sharing is not configured on this server');
  if (!req.file) throw new HttpError(422, 'Choose an image to upload');
  const { url } = await cloud.uploadBuffer(req.file.buffer, 'kaasni/m');
  ok(res, { url }, 'Uploaded', 201);
});

// DELETE /api/chat/messages/:id?scope=me|everyone
exports.deleteMessage = asyncHandler(async (req, res) => {
  const result = await chat.deleteMessage(req.user._id, req.params.id, req.query.scope || 'me');
  chat.broadcastDelete(result);
  ok(res, { messageId: result.messageId, conversationId: result.conversationId, scope: result.scope, message: result.message }, 'Message deleted');
});
