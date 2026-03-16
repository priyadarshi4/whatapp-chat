const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { data, type = 'image', folder = 'couple-chat' } = req.body;
    if (!data) return res.status(400).json({ error: 'No file data' });

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Determine resource type
      let resourceType = 'image';
      if (type === 'audio' || type === 'voice_note') resourceType = 'video'; // Cloudinary uses 'video' for audio
      else if (type === 'video') resourceType = 'video';
      else if (type === 'file') resourceType = 'raw';

      const uploadOptions = {
        folder,
        resource_type: resourceType,
      };

      // For video files, also generate thumbnail
      if (type === 'video') {
        uploadOptions.eager = [{ format: 'jpg', transformation: [{ start_offset: '0' }] }];
      }

      const result = await cloudinary.uploader.upload(data, uploadOptions);

      return res.json({
        url: result.secure_url,
        publicId: result.public_id,
        thumbnail: type === 'video' ? result.eager?.[0]?.secure_url : undefined,
        width: result.width,
        height: result.height,
        resourceType,
      });
    }

    // Fallback: return data URL as-is (dev mode without Cloudinary)
    res.json({ url: data });
  } catch (err) {
    console.error('Upload error:', err.message);
    // Fallback to data URL on error
    res.json({ url: req.body.data });
  }
});

module.exports = router;
