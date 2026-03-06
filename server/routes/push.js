const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get VAPID public key (needed by client to subscribe)
// @route   GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured on this server.' });
  }
  res.json({ publicKey: key });
});

// @desc    Save push subscription for current user
// @route   POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object.' });
    }

    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ success: true, message: 'Push subscription saved.' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription.' });
  }
});

// @desc    Remove push subscription (user opts out)
// @route   POST /api/push/unsubscribe
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.json({ success: true, message: 'Unsubscribed from push notifications.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
});

// @desc    Send a test push notification to the current user
// @route   POST /api/push/test
router.post('/test', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.pushSubscription) {
      return res.status(400).json({ error: 'No push subscription found. Please enable notifications first.' });
    }

    const { notifyUser } = require('../utils/webPush');
    await notifyUser(user, {
      title: '🔔 ChatApp Notifications',
      body: 'Push notifications are working! You\'ll receive messages even when offline.',
      icon: '/chat-icon.svg',
      badge: '/badge-icon.png',
      tag: 'test-notification',
    });

    res.json({ success: true, message: 'Test notification sent.' });
  } catch (err) {
    console.error('Test push error:', err);
    res.status(500).json({ error: 'Failed to send test notification.' });
  }
});

module.exports = router;
