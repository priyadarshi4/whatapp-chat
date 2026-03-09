const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/partner', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('partnerId', 'username avatar isOnline lastSeen mood moodUpdatedAt');
    res.json({ partner: user.partnerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/mood', auth, async (req, res) => {
  try {
    const { mood } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { mood, moodUpdatedAt: new Date() }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 3: Profile picture + name update
router.patch('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, relationshipStartDate } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;
    if (relationshipStartDate) updates.relationshipStartDate = new Date(relationshipStartDate);
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const Message = require('../models/Message');
    const Chat = require('../models/Chat');
    const user = await User.findById(req.userId);
    const chat = await Chat.findOne({ participants: { $all: [req.userId, user.partnerId] } });
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalMessages, todayMessages, photoCount] = await Promise.all([
      Message.countDocuments({ chatId: chat?._id, isDeleted: false }),
      Message.countDocuments({ chatId: chat?._id, isDeleted: false, createdAt: { $gte: today } }),
      Message.countDocuments({ chatId: chat?._id, type: 'image', isDeleted: false }),
    ]);
    const daysTogether = user.relationshipStartDate
      ? Math.floor((Date.now() - user.relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    res.json({ totalMessages, todayMessages, photoCount, daysTogether });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
