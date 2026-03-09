const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/subscribe', async (req, res) => {
  const { userId, subscription } = req.body;

  await User.findByIdAndUpdate(userId, {
    pushSubscription: subscription,
  });

  res.json({ success: true });
});

module.exports = router;