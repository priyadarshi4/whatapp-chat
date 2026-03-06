const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect } = require('../middleware/auth');
const {
  createStatus, getFeedStatuses, getMyStatuses,
  viewStatus, deleteStatus, getStatusViewers, getContacts,
} = require('../controllers/statusController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024 }, // 64 MB
  fileFilter: (_, file, cb) =>
    /^(image|video)\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Images & videos only')),
});

router.get('/',                   protect, getFeedStatuses);
router.get('/my',                 protect, getMyStatuses);
router.get('/contacts',           protect, getContacts);
router.post('/',                  protect, upload.single('media'), createStatus);
router.post('/:statusId/view',    protect, viewStatus);
router.get('/:statusId/viewers',  protect, getStatusViewers);
router.delete('/:statusId',       protect, deleteStatus);

module.exports = router;
