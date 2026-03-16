const mongoose = require('mongoose');

const coupleGameSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['puzzle', 'quiz', 'memory'], default: 'puzzle' },
  imageUrl: { type: String },
  gridSize: { type: Number, default: 3 }, // 3x3
  // pieces: array of piece positions (shuffled)
  pieces: [{ id: Number, currentPos: Number, correctPos: Number }],
  solvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  solvedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending','active','solved'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('CoupleGame', coupleGameSchema);
