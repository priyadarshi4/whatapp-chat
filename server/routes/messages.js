const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

router.get('/:chatId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({ chatId: req.params.chatId, isDeleted: false })
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('senderId', 'username avatar')
      .populate({ path: 'replyTo', select: 'content senderId type mediaUrl', populate: { path: 'senderId', select: 'username avatar' } });
    res.json({ messages: messages.reverse(), page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { chatId, content, type = 'text', mediaUrl, gifUrl, songData, unlockAt, replyTo, location, fileName, fileSize, fileMime } = req.body;
    const isUnlocked = !unlockAt || new Date(unlockAt) <= new Date();
    const msg = new Message({
      chatId, senderId: req.userId, content, type, mediaUrl, gifUrl,
      songData, location, fileName, fileSize, fileMime,
      unlockAt: unlockAt ? new Date(unlockAt) : undefined,
      isUnlocked, replyTo: replyTo || undefined, deliveryStatus: 'sent',
    });
    await msg.save();
    await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id, lastMessageAt: new Date() });
    await msg.populate('senderId', 'username avatar');
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE for me / for everyone
router.delete('/:id', auth, async (req, res) => {
  try {
    const { deleteFor = 'me' } = req.query;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (deleteFor === 'everyone' && msg.senderId.toString() === req.userId) {
      msg.deletedForEveryone = true;
      msg.content = 'This message was deleted';
      msg.mediaUrl = undefined;
      msg.gifUrl = undefined;
    } else {
      msg.isDeleted = true;
    }
    await msg.save();
    res.json({ success: true, deleteFor });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const existing = msg.reactions.find(r => r.userId.toString() === req.userId);
    if (existing) {
      if (existing.emoji === emoji) msg.reactions = msg.reactions.filter(r => r.userId.toString() !== req.userId);
      else existing.emoji = emoji;
    } else { msg.reactions.push({ userId: req.userId, emoji }); }
    await msg.save();
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:chatId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { chatId: req.params.chatId, senderId: { $ne: req.userId }, deliveryStatus: { $in: ['sent', 'delivered'] } },
      { deliveryStatus: 'read', isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:chatId/pinned', auth, async (req, res) => {
  try {
    const msgs = await Message.find({ chatId: req.params.chatId, isPinned: true, isDeleted: false })
      .populate('senderId', 'username avatar').sort({ pinnedAt: -1 });
    res.json({ messages: msgs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
