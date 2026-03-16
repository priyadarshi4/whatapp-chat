const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CoupleRoom = require('../models/CoupleRoom');
const User = require('../models/User');
const ChatModel = require('../models/Chat');

// GET or create room
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    let room = await CoupleRoom.findOne({ participants: { $all: [req.userId, user.partnerId] } });
    if (!room) {
      room = new CoupleRoom({ participants: [req.userId, user.partnerId] });
      await room.save();
    }
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update room
router.patch('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const { roomName, wallpaper, avatarA, avatarB } = req.body;
    const room = await CoupleRoom.findOneAndUpdate(
      { participants: { $all: [req.userId, user.partnerId] } },
      { ...(roomName && { roomName }), ...(wallpaper !== undefined && { wallpaper }), ...(avatarA && { avatarA }), ...(avatarB && { avatarB }), lastActivity: new Date() },
      { new: true }
    );
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add photo to room
router.post('/photo', auth, async (req, res) => {
  try {
    const { url, caption } = req.body;
    const user = await User.findById(req.userId);
    const room = await CoupleRoom.findOneAndUpdate(
      { participants: { $all: [req.userId, user.partnerId] } },
      { $push: { photos: { url, caption, addedBy: req.userId } }, lastActivity: new Date() },
      { new: true }
    );
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE photo
router.delete('/photo/:photoId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const room = await CoupleRoom.findOneAndUpdate(
      { participants: { $all: [req.userId, user.partnerId] } },
      { $pull: { photos: { _id: req.params.photoId } } },
      { new: true }
    );
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH set current video
router.patch('/video', auth, async (req, res) => {
  try {
    const { url, title } = req.body;
    const user = await User.findById(req.userId);
    const room = await CoupleRoom.findOneAndUpdate(
      { participants: { $all: [req.userId, user.partnerId] } },
      { currentVideo: { url, title, addedBy: user.username }, videoPlaying: false, videoTime: 0, lastActivity: new Date() },
      { new: true }
    );
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add decoration
router.post('/decor', auth, async (req, res) => {
  try {
    const { type, content, x, y, scale } = req.body;
    const user = await User.findById(req.userId);
    const room = await CoupleRoom.findOneAndUpdate(
      { participants: { $all: [req.userId, user.partnerId] } },
      { $push: { decorations: { type, content, x, y, scale } }, lastActivity: new Date() },
      { new: true }
    );
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
