const mongoose = require('mongoose');

const MESSAGE_STATUS = ['sent', 'delivered', 'read'];
const CALL_OUTCOMES = ['completed', 'missed', 'declined'];

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // AES-256-GCM ciphertext. Plaintext is never stored. See utils/crypto.js.
    textEncrypted: {
      type: new mongoose.Schema({ iv: String, tag: String, data: String }, { _id: false }),
      default: undefined,
    },
    // "call": a call log entry (no text or media; sender = caller, receiver = callee).
    kind: { type: String, enum: ['text', 'call'], default: 'text' },
    call: {
      type: new mongoose.Schema(
        {
          type: { type: String, enum: ['audio', 'video'], required: true },
          outcome: { type: String, enum: CALL_OUTCOMES, required: true },
          duration: { type: Number, default: 0 }, // seconds, completed calls only
        },
        { _id: false }
      ),
      default: undefined,
    },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    status: { type: String, enum: MESSAGE_STATUS, default: 'sent' },
    deliveredAt: Date,
    readAt: Date,
    // "Delete for me": users who hid this message.
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // "Delete for everyone": content is wiped and a placeholder is returned instead.
    deletedForEveryone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, _id: -1 });
messageSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);
module.exports.MESSAGE_STATUS = MESSAGE_STATUS;
module.exports.CALL_OUTCOMES = CALL_OUTCOMES;
