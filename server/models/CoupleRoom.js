const mongoose = require('mongoose');

const coupleRoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roomName: { type: String, default: 'Our Room 💕' },
  wallpaper: { type: String, default: '' },
  photos: [{
    url: String,
    caption: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  decorations: [{
    type: String, // 'sticker', 'text', 'emoji'
    content: String,
    x: Number, y: Number,
    scale: { type: Number, default: 1 },
  }],
  avatarA: { type: String, default: '🧑' },
  avatarB: { type: String, default: '👧' },
  currentVideo: { url: String, title: String, addedBy: String },
  videoPlaying: { type: Boolean, default: false },
  videoTime: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('CoupleRoom', coupleRoomSchema);
