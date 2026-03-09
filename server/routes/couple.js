const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// GET /api/couple/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('partnerId');
    const chat = await Chat.findOne({ participants: { $all: [req.userId, user.partnerId?._id] } });

    const today = new Date(); today.setHours(0,0,0,0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalMessages, todayMessages, photoCount, missYouCount, weekMessages] = await Promise.all([
      Message.countDocuments({ chatId: chat?._id }),
      Message.countDocuments({ chatId: chat?._id, createdAt: { $gte: today } }),
      Message.countDocuments({ chatId: chat?._id, type: 'image' }),
      Message.countDocuments({ chatId: chat?._id, type: 'miss_you' }),
      Message.countDocuments({ chatId: chat?._id, createdAt: { $gte: weekAgo } }),
    ]);

    const startDate = user.relationshipStartDate || user.createdAt;
    const daysTogether = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      daysTogether,
      totalMessages,
      todayMessages,
      photoCount,
      missYouCount,
      weekMessages,
      partnerName: user.partnerId?.username || 'Your Love',
      partnerAvatar: user.partnerId?.avatar || '',
      partnerMood: user.partnerId?.mood || '',
      partnerOnline: user.partnerId?.isOnline || false,
      relationshipStartDate: startDate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/couple/relationship-date
router.patch('/relationship-date', auth, async (req, res) => {
  try {
    const { date } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { relationshipStartDate: new Date(date) }, { new: true });
    // Also update partner
    if (user.partnerId) {
      await User.findByIdAndUpdate(user.partnerId, { relationshipStartDate: new Date(date) });
    }
    res.json({ success: true, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
