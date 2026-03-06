const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  createOrGetChat,
  getChats,
  createGroupChat,
  updateGroup,
  addGroupMember,
  removeGroupMember,
  deleteChat,
} = require('../controllers/chatController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', protect, getChats);
router.post('/', protect, createOrGetChat);
router.post('/group', protect, upload.single('avatar'), createGroupChat);
router.put('/group/:chatId', protect, upload.single('avatar'), updateGroup);
router.post('/group/:chatId/add', protect, addGroupMember);
router.post('/group/:chatId/remove', protect, removeGroupMember);
router.delete('/:chatId', protect, deleteChat);

module.exports = router;
