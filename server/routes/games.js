const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CoupleGame = require('../models/CoupleGame');
const User = require('../models/User');
const api_upload = require('./uploads');

// GET current game
router.get('/current', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const game = await CoupleGame.findOne({
      participants: { $all: [req.userId, user.partnerId] },
      status: { $in: ['pending', 'active'] }
    }).sort({ createdAt: -1 });
    res.json({ game });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create puzzle game
router.post('/puzzle', auth, async (req, res) => {
  try {
    const { imageUrl, gridSize = 3 } = req.body;
    const user = await User.findById(req.userId);
    const total = gridSize * gridSize;
    // Create shuffled pieces
    const positions = Array.from({ length: total }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const pieces = positions.map((correctPos, currentPos) => ({ id: currentPos, currentPos, correctPos }));

    const game = new CoupleGame({
      participants: [req.userId, user.partnerId],
      type: 'puzzle',
      imageUrl,
      gridSize,
      pieces,
      createdBy: req.userId,
      status: 'active',
    });
    await game.save();
    res.status(201).json({ game });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH move piece
router.patch('/:id/move', auth, async (req, res) => {
  try {
    const { pieceId, toPosition } = req.body;
    const game = await CoupleGame.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Not found' });

    // Swap pieces
    const moving = game.pieces.find(p => p.id === pieceId);
    const swapping = game.pieces.find(p => p.currentPos === toPosition);
    if (moving && swapping) {
      const tmp = moving.currentPos;
      moving.currentPos = toPosition;
      swapping.currentPos = tmp;
    }

    // Check solved
    const solved = game.pieces.every(p => p.currentPos === p.correctPos);
    if (solved) {
      game.status = 'solved';
      game.solvedBy = req.userId;
      game.solvedAt = new Date();
    }

    game.markModified('pieces');
    await game.save();
    res.json({ game, solved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
