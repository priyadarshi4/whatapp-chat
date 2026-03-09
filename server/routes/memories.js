const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// GET /api/memories — photos + pinned messages
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const chat = await Chat.findOne({ participants: { $all: [req.userId, user.partnerId] } });
    if (!chat) return res.json({ photos: [], pinned: [] });

    const [photos, pinned] = await Promise.all([
      Message.find({ chatId: chat._id, type: 'image', isDeleted: false })
        .sort({ createdAt: -1 })
        .populate('senderId', 'username avatar')
        .limit(100),
      Message.find({ chatId: chat._id, isPinned: true, isDeleted: false })
        .sort({ pinnedAt: -1 })
        .populate('senderId', 'username avatar'),
    ]);

    res.json({ photos, pinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
