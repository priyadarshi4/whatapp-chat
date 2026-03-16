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
    enum: [
      'text','image','audio','video','file',
      'miss_you','good_morning','good_night','song','surprise','time_capsule','system',
      // NEW TYPES
      'gif','location','voice_note','hug','deleted_for_me','deleted_for_everyone',
      'midnight_message'
    ],
    default: 'text'
  },
  mediaUrl: { type: String },
  mediaThumbnail: { type: String },

  // File metadata
  fileName: { type: String },
  fileSize: { type: Number },
  fileMime: { type: String },

  // Location
  location: {
    lat: Number,
    lng: Number,
    address: String,
    isLive: { type: Boolean, default: false },
  },

  // GIF
  gifUrl: { type: String },

  reactions: [reactionSchema],
  deliveryStatus: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read'],
    default: 'sent',
  },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  isRead: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false },

  unlockAt: { type: Date },
  isUnlocked: { type: Boolean, default: true },
  songData: { title: String, artist: String, url: String, thumbnail: String },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ isPinned: 1, chatId: 1 });
module.exports = mongoose.model('Message', messageSchema);
