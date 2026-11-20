const mongoose = require('mongoose');

// A one-to-one thread between two chatusers.
const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: { validator: (v) => v.length === 2, message: 'A conversation needs exactly 2 participants' },
    },
    // Sorted "idA_idB": guarantees a single conversation per pair of users.
    pairKey: { type: String, required: true, unique: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // createdAt / updatedAt
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

conversationSchema.statics.pairKeyFor = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = mongoose.model('Conversation', conversationSchema);
