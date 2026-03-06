const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { sendPushToUser } = require('../utils/webPush');

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    console.error('[Push] VAPID_PUBLIC_KEY not set in .env');
    return res.status(503).json({ error: 'Push notifications not configured.' });
  }
  res.json({ publicKey: key });
});

// POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription.' });
    }
    console.log('[Push] Saving subscription for:', req.user.name, req.user._id.toString());
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription.' });
  }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
});

// POST /api/push/test
router.post('/test', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.pushSubscription) {
      return res.status(400).json({ error: 'No subscription. Enable notifications first.' });
    }
    const result = await sendPushToUser(user, {
      title: 'ChatApp Test',
      body: 'Push notifications are working!',
      icon: '/chat-icon.svg',
      tag: 'chatapp-test',
      data: { url: '/', chatId: null },
    });
    if (!result) return res.status(500).json({ error: 'Push failed. Check VAPID keys in .env' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] Test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/push/status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('pushSubscription');
    res.json({
      hasSubscription: !!user?.pushSubscription,
      vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed.' });
  }
});

module.exports = router;
