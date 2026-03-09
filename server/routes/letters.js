const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Letter = require('../models/Letter');
const User = require('../models/User');

// GET /api/letters
router.get('/', auth, async (req, res) => {
  try {
    const letters = await Letter.find({
      $or: [{ authorId: req.userId }, { recipientId: req.userId }],
      isDraft: false,
    }).populate('authorId', 'username avatar').sort({ createdAt: -1 });
    res.json({ letters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/letters/drafts
router.get('/drafts', auth, async (req, res) => {
  try {
    const drafts = await Letter.find({ authorId: req.userId, isDraft: true }).sort({ updatedAt: -1 });
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/letters
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, isDraft, scheduledAt } = req.body;
    const user = await User.findById(req.userId);
    const letter = new Letter({
      authorId: req.userId,
      recipientId: user.partnerId,
      title,
      content,
      imageUrl,
      isDraft: isDraft || false,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      sentAt: !isDraft ? new Date() : undefined,
    });
    await letter.save();
    res.status(201).json({ letter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/letters/:id/open
router.patch('/:id/open', auth, async (req, res) => {
  try {
    const letter = await Letter.findByIdAndUpdate(
      req.params.id,
      { isOpened: true, openedAt: new Date() },
      { new: true }
    ).populate('authorId', 'username avatar');
    res.json({ letter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/letters/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Letter.findOneAndDelete({ _id: req.params.id, authorId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
