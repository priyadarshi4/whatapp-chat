const mongoose = require('mongoose');

const viewerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now },
});

const statusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrl:      { type: String, required: true },
    mediaPublicId: { type: String, default: '' },
    mediaType:     { type: String, enum: ['image', 'video'], required: true },
    caption:       { type: String, default: '', maxlength: 200 },
    thumbnail:     { type: String, default: '' },
    duration:      { type: Number, default: null },
    privacy: {
      type: String,
      enum: ['everyone', 'contacts', 'selected'],
      default: 'everyone',
    },
    allowedViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewers: [viewerSchema],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

statusSchema.index({ userId: 1, expiresAt: -1 });
module.exports = mongoose.model('Status', statusSchema);
