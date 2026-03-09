const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'A Letter For You ❤️' },
  content: { type: String, required: true },
  imageUrl: { type: String },
  isDraft: { type: Boolean, default: false },
  scheduledAt: { type: Date },
  sentAt: { type: Date },
  openedAt: { type: Date },
  isOpened: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Letter', letterSchema);
