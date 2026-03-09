const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Status = require('../models/Status');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const statuses = await Status.find({
      $or: [{ userId: req.userId }, { userId: user.partnerId }],
      $or: [{ expiresAt: { $gte: new Date() } }, { isHighlight: true }],
    }).populate('userId', 'username avatar').sort({ createdAt: -1 });
    res.json({ statuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { type, content, imageUrl, mediaItems, caption, backgroundColor, isHighlight } = req.body;
    const status = new Status({
      userId: req.userId, type, content, imageUrl, mediaItems,
      caption, backgroundColor, isHighlight,
    });
    await status.save();
    await status.populate('userId', 'username avatar');
    res.status(201).json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ error: 'Not found' });
    const existing = status.reactions.find(r => r.userId.toString() === req.userId);
    if (existing) existing.emoji = emoji;
    else status.reactions.push({ userId: req.userId, emoji });
    await status.save();
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/view', auth, async (req, res) => {
  try {
    const status = await Status.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { viewedBy: req.userId } },
      { new: true }
    );
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Status.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
