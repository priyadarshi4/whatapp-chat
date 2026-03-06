const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  markAsSeen,
  searchMessages,
  forwardMessage,
} = require('../controllers/messageController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.get('/:chatId', protect, getMessages);
router.get('/:chatId/search', protect, searchMessages);
router.post('/', protect, upload.single('file'), sendMessage);
router.post('/forward', protect, forwardMessage);
router.put('/:messageId', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:messageId/react', protect, addReaction);
router.post('/:chatId/seen', protect, markAsSeen);

module.exports = router;
