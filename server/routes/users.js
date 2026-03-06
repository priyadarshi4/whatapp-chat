// users.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  getUserById,
  searchUsers,
  updateProfile,
  updateStatus,
  blockUser,
  unblockUser,
  togglePinChat,
  toggleStarMessage,
  getStarredMessages,
} = require('../controllers/userController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/search', protect, searchUsers);
router.get('/starred-messages', protect, getStarredMessages);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/status', protect, updateStatus);
router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);
router.post('/pin-chat/:chatId', protect, togglePinChat);
router.post('/star-message/:messageId', protect, toggleStarMessage);

module.exports = router;
