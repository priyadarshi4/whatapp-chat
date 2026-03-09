const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emoji: { type: String },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'file', 'miss_you', 'good_morning', 'good_night', 'song', 'surprise', 'time_capsule', 'system'],
    default: 'text'
  },
  mediaUrl: { type: String },
  mediaThumbnail: { type: String },
  reactions: [reactionSchema],

  // FEATURE 6: WhatsApp-style delivery status
  // 'sent' = saved to DB (single tick ✓)
  // 'delivered' = partner socket is online when message sent (double tick ✓✓)
  // 'read' = partner has opened the chat and read it (blue ticks 💙)
  deliveryStatus: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read'],
    default: 'sent',
  },
  deliveredAt: { type: Date },
  readAt: { type: Date },

  // Legacy field kept for backward compat
  isRead: { type: Boolean, default: false },

  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },

  // Surprise / time capsule
  unlockAt: { type: Date },
  isUnlocked: { type: Boolean, default: true },

  // Song metadata
  songData: {
    title: String,
    artist: String,
    url: String,
    thumbnail: String,
  },

  // FEATURE 1: Reply system
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ isPinned: 1, chatId: 1 });
messageSchema.index({ deliveryStatus: 1, chatId: 1 });

module.exports = mongoose.model('Message', messageSchema);
