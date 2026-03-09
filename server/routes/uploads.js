const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// POST /api/upload — supports image, video, avatar
router.post('/', auth, async (req, res) => {
  try {
    const { data, type = 'image', folder = 'couple-chat' } = req.body;
    if (!data) return res.status(400).json({ error: 'No file data' });

    // Cloudinary upload
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const resourceType = type === 'video' ? 'video' : 'image';
      const result = await cloudinary.uploader.upload(data, {
        folder,
        resource_type: resourceType,
        // Generate thumbnail for videos
        ...(type === 'video' && { eager: [{ format: 'jpg', transformation: [{ start_offset: '0' }] }] }),
      });
      return res.json({
        url: result.secure_url,
        publicId: result.public_id,
        thumbnail: type === 'video' ? result.eager?.[0]?.secure_url : undefined,
        width: result.width,
        height: result.height,
      });
    }

    // Fallback: return data URL as-is (works for local dev without Cloudinary)
    res.json({ url: data });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
