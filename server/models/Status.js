const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['image', 'video', 'text', 'love_note'], default: 'text' },
  content: { type: String },
  // Single image (legacy)
  imageUrl: { type: String },
  // FEATURE 4 & 6: Multiple media support
  mediaItems: [{
    url: { type: String },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    thumbnail: { type: String },
  }],
  caption: { type: String },
  backgroundColor: { type: String, default: '#FF4F8B' },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
  }],
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  isHighlight: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Status', statusSchema);
