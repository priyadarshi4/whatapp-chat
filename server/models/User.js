const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  mood: { type: String, enum: ['happy','missing_you','thinking_of_you','busy','in_love',''], default: '' },
  moodUpdatedAt: { type: Date },

  // WhatsApp status
  statusText: { type: String, default: '' },
  statusUpdatedAt: { type: Date },

  pushSubscription: { endpoint: String, keys: { p256dh: String, auth: String } },
  relationshipStartDate: { type: Date },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  coupleRole: { type: String, enum: ['user_a','user_b',''], default: '' },

  // Offline unread message count
  offlineUnreadCount: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
