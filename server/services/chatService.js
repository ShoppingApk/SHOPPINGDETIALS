// Chat business logic shared by the REST controller and the Socket.IO handlers.
const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const HttpError = require('../utils/httpError');
const { encrypt, decrypt } = require('../utils/crypto');
const registry = require('../socket/registry');
const cloud = require('../config/cloudinary');
const env = require('../config/env');

const MAX_TEXT = 2000;
const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000;
const DELETED_PLACEHOLDER = 'This message was deleted';

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v) && /^[a-f0-9]{24}$/i.test(v);
const sid = (v) => String(v?._id ?? v);

// Public shape of a chat user: never includes email, password or role.
const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  avatar: u.avatar || '',
  online: registry.isOnline(u._id),
  lastSeen: u.lastSeen || null,
});

// Client-facing message. Ciphertext and storage ids are never returned.
function serialize(m) {
  const base = {
    _id: m._id,
    conversation: m.conversation,
    sender: m.sender,
    receiver: m.receiver,
    status: m.status,
    createdAt: m.createdAt,
    deliveredAt: m.deliveredAt || null,
    readAt: m.readAt || null,
  };
  if (m.deletedForEveryone) return { ...base, deleted: true, text: DELETED_PLACEHOLDER, imageUrl: '' };
  return { ...base, deleted: false, text: decrypt(m.textEncrypted), imageUrl: m.imageUrl || '' };
}

// Only images uploaded to our own Cloudinary account may be attached to messages.
function isOwnImageUrl(url) {
  if (!cloud.isConfigured) return false;
  return typeof url === 'string' && url.startsWith(`https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/`) && url.length < 500;
}

async function activeChatuser(userId) {
  return User.findOne({ _id: userId, role: 'chatuser', isActive: true }).select('name avatar lastSeen');
}

// Loads a conversation the user participates in, or throws 404.
async function conversationFor(userId, conversationId) {
  if (!isId(String(conversationId))) throw new HttpError(404, 'Conversation not found');
  const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
  if (!conv) throw new HttpError(404, 'Conversation not found');
  return conv;
}

const otherParticipant = (conv, userId) => conv.participants.find((p) => String(p) !== String(userId));

// ---------- users & conversations ----------

async function searchUsers(me, q = '') {
  const filter = { role: 'chatuser', isActive: true, _id: { $ne: me } };
  const term = String(q).trim().slice(0, 50);
  if (term) filter.name = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find(filter).select('name avatar lastSeen').sort({ name: 1 }).limit(30).lean();
  return users.map(publicUser);
}

async function getOrCreateConversation(me, otherId) {
  if (!isId(String(otherId)) || String(otherId) === String(me)) throw new HttpError(400, 'Choose another user');
  const other = await activeChatuser(otherId);
  if (!other) throw new HttpError(404, 'User not found');

  const pairKey = Conversation.pairKeyFor(me, otherId);
  const conv = await Conversation.findOneAndUpdate(
    { pairKey },
    { $setOnInsert: { participants: [me, otherId], pairKey, lastMessageAt: new Date() } },
    { upsert: true, new: true }
  );
  return conversationView(conv, me, other);
}

async function lastVisibleMessage(conversationId, me) {
  const m = await Message.findOne({ conversation: conversationId, deletedFor: { $ne: me } }).sort({ _id: -1 }).lean();
  return m ? serialize(m) : null;
}

async function conversationView(conv, me, otherUser, unread = 0) {
  const lastMessage = await lastVisibleMessage(conv._id, me);
  return {
    _id: conv._id,
    other: otherUser ? publicUser(otherUser) : { _id: otherParticipant(conv, me), name: 'Unknown user', avatar: '', online: false, lastSeen: null },
    lastMessage,
    unread,
    updatedAt: conv.lastMessageAt || conv.updatedAt,
  };
}

async function listConversations(me) {
  const convs = await Conversation.find({ participants: me })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate('participants', 'name avatar lastSeen role isActive')
    .lean();
  if (!convs.length) return [];

  const unreadAgg = await Message.aggregate([
    {
      $match: {
        conversation: { $in: convs.map((c) => c._id) },
        receiver: new mongoose.Types.ObjectId(String(me)),
        status: { $ne: 'read' },
        deletedFor: { $ne: new mongoose.Types.ObjectId(String(me)) },
        deletedForEveryone: false,
      },
    },
    { $group: { _id: '$conversation', n: { $sum: 1 } } },
  ]);
  const unread = Object.fromEntries(unreadAgg.map((u) => [String(u._id), u.n]));

  const views = await Promise.all(
    convs.map((c) => {
      const other = c.participants.find((p) => p && String(p._id) !== String(me));
      return conversationView(c, me, other, unread[String(c._id)] || 0);
    })
  );
  return views;
}

// Newest first. `before` = message id cursor.
async function listMessages(me, conversationId, { before, limit = 30 } = {}) {
  await conversationFor(me, conversationId);
  const n = Math.min(Math.max(Number(limit) || 30, 1), 50);
  const filter = { conversation: conversationId, deletedFor: { $ne: me } };
  if (before) {
    if (!isId(String(before))) throw new HttpError(422, 'Invalid cursor');
    filter._id = { $lt: before };
  }
  const docs = await Message.find(filter).sort({ _id: -1 }).limit(n + 1).lean();
  return { messages: docs.slice(0, n).map(serialize), hasMore: docs.length > n };
}

// ---------- messages ----------

async function sendMessage(me, { conversationId, text, imageUrl }) {
  const body = typeof text === 'string' ? text.trim() : '';
  if (body.length > MAX_TEXT) throw new HttpError(422, `Messages can be at most ${MAX_TEXT} characters`);
  if (imageUrl && !isOwnImageUrl(imageUrl)) throw new HttpError(422, 'Invalid image');
  if (!body && !imageUrl) throw new HttpError(422, 'Message is empty');

  const conv = await conversationFor(me, conversationId);
  const receiver = otherParticipant(conv, me);
  if (!(await activeChatuser(receiver))) throw new HttpError(403, 'This user is not available');

  const msg = await Message.create({
    conversation: conv._id,
    sender: me,
    receiver,
    textEncrypted: encrypt(body),
    imageUrl: imageUrl || '',
    imagePublicId: imageUrl ? (imageUrl.split('/upload/')[1] || '').replace(/^v\d+\//, '').replace(/\.[a-z0-9]+$/i, '') : '',
  });
  conv.lastMessage = msg._id;
  conv.lastMessageAt = msg.createdAt;
  await conv.save();
  return serialize(msg);
}

// Marks messages addressed to `me` as delivered. Returns [{ senderId, conversationId, messageIds }].
async function markDelivered(me, filter) {
  const docs = await Message.find({ ...filter, receiver: me, status: 'sent' }).select('_id sender conversation').lean();
  if (!docs.length) return [];
  const now = new Date();
  await Message.updateMany({ _id: { $in: docs.map((d) => d._id) }, status: 'sent' }, { $set: { status: 'delivered', deliveredAt: now } });
  const groups = new Map();
  for (const d of docs) {
    const key = `${d.sender}|${d.conversation}`;
    if (!groups.has(key)) groups.set(key, { senderId: String(d.sender), conversationId: String(d.conversation), messageIds: [], at: now });
    groups.get(key).messageIds.push(String(d._id));
  }
  return [...groups.values()];
}

const markDeliveredByIds = (me, ids) => markDelivered(me, { _id: { $in: ids } });
const markAllPendingDelivered = (me) => markDelivered(me, {});

// Marks every unread message to `me` in a conversation as read.
async function markRead(me, conversationId) {
  const conv = await conversationFor(me, conversationId);
  const docs = await Message.find({ conversation: conv._id, receiver: me, status: { $ne: 'read' } }).select('_id').lean();
  if (!docs.length) return { conversationId: String(conv._id), senderId: String(otherParticipant(conv, me)), messageIds: [] };
  const now = new Date();
  const ids = docs.map((d) => d._id);
  await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'read', readAt: now, deliveredAt: now } });
  return { conversationId: String(conv._id), senderId: String(otherParticipant(conv, me)), messageIds: ids.map(String), at: now };
}

// scope "me": hide for me. scope "everyone": sender only, within 1 hour; wipes the content.
async function deleteMessage(me, messageId, scope) {
  if (!isId(String(messageId))) throw new HttpError(404, 'Message not found');
  if (!['me', 'everyone'].includes(scope)) throw new HttpError(422, 'scope must be "me" or "everyone"');

  const msg = await Message.findOne({ _id: messageId, $or: [{ sender: me }, { receiver: me }] });
  if (!msg) throw new HttpError(404, 'Message not found');

  if (scope === 'me') {
    await Message.updateOne({ _id: msg._id }, { $addToSet: { deletedFor: me } });
    return { scope, messageId: String(msg._id), conversationId: String(msg.conversation), notify: [String(me)] };
  }

  if (String(msg.sender) !== String(me)) throw new HttpError(403, 'You can only delete your own messages for everyone');
  if (Date.now() - msg.createdAt.getTime() > DELETE_FOR_EVERYONE_WINDOW_MS) {
    throw new HttpError(400, 'Messages can be deleted for everyone only within 1 hour');
  }
  if (!msg.deletedForEveryone) {
    const { imagePublicId: publicId, imageUrl } = msg;
    msg.deletedForEveryone = true;
    msg.textEncrypted = undefined;
    msg.imageUrl = '';
    msg.imagePublicId = '';
    await msg.save();
    // Remove the file only if no other message still points at the same image.
    if (publicId && !(await Message.exists({ imageUrl, _id: { $ne: msg._id } }))) await cloud.destroy([publicId]);
  }
  return {
    scope,
    messageId: String(msg._id),
    conversationId: String(msg.conversation),
    message: serialize(msg),
    notify: [String(msg.sender), String(msg.receiver)],
  };
}

// Sends a delete result to the right people (all tabs of each).
function broadcastDelete(result) {
  for (const uid of result.notify) {
    registry.emitToUser(uid, 'message:deleted', {
      messageId: result.messageId,
      conversationId: result.conversationId,
      scope: result.scope,
      message: result.message,
    });
  }
}

module.exports = {
  MAX_TEXT,
  isId,
  sid,
  serialize,
  searchUsers,
  getOrCreateConversation,
  listConversations,
  listMessages,
  conversationFor,
  otherParticipant,
  sendMessage,
  markDeliveredByIds,
  markAllPendingDelivered,
  markRead,
  deleteMessage,
  broadcastDelete,
};
