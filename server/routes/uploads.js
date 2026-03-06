const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { uploadToCloudinary } = require('../config/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /image|video|audio|application\/pdf|application\/msword|application\/vnd/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  },
});

router.post('/media', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const result = await uploadToCloudinary(req.file.buffer, {
      resource_type: 'auto',
      folder: 'chat-app/media',
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

module.exports = router;
