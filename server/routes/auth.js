const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, coupleRole, relationshipStartDate } = req.body;

    // Couple lock: only allow registered email pairs
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Private Couple App ❤️', isPrivate: true });
    }

    const existingCount = await User.countDocuments();
    if (existingCount >= 2 && ALLOWED_EMAILS.length === 0) {
      return res.status(403).json({ error: 'Private Couple App ❤️', isPrivate: true });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const user = new User({
      username,
      email,
      password,
      coupleRole: coupleRole || (existingCount === 0 ? 'user_a' : 'user_b'),
      relationshipStartDate: relationshipStartDate ? new Date(relationshipStartDate) : null,
    });
    await user.save();

    // Link partners
    const other = await User.findOne({ _id: { $ne: user._id } });
    if (other) {
      user.partnerId = other._id;
      other.partnerId = user._id;
      await user.save();
      await other.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'couple-secret-key', { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Private Couple App ❤️', isPrivate: true });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    user.isOnline = true;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'couple-secret-key', { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'couple-secret-key');
      await User.findByIdAndUpdate(decoded.userId, { isOnline: false, lastSeen: new Date() });
    }
    res.json({ success: true });
  } catch (_) {
    res.json({ success: true });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'couple-secret-key');
    const user = await User.findById(decoded.userId).select('-password').populate('partnerId', 'username avatar isOnline lastSeen mood');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (_) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
