const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

// GET /api/chats — get or create the couple chat
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const partnerId = user.partnerId;

    let chat = await Chat.findOne({ participants: { $all: [req.userId, partnerId] } })
      .populate('participants', 'username avatar isOnline lastSeen mood')
      .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } });

    if (!chat && partnerId) {
      chat = new Chat({ participants: [req.userId, partnerId], isCouple: true });
      await chat.save();
      await chat.populate('participants', 'username avatar isOnline lastSeen mood');
    }

    res.json({ chats: chat ? [chat] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'username avatar isOnline lastSeen mood')
      .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'username' } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
