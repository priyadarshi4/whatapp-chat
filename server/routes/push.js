const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/push/vapid — return public key to client
router.get('/vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe — save push subscription for user
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { pushSubscription: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
