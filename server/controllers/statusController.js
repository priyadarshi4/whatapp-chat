const Status  = require('../models/Status');
const User    = require('../models/User');
const Chat    = require('../models/Chat');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/* ── helpers ─────────────────────────────────────────────── */
async function getContactIds(userId) {
  const chats = await Chat.find({ participants: userId }).select('participants').lean();
  const ids = new Set();
  chats.forEach(c => c.participants.forEach(p => {
    if (p.toString() !== userId.toString()) ids.add(p.toString());
  }));
  return [...ids];
}

/* ── POST /api/status ─────────────────────────────────────── */
exports.createStatus = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Media file is required.' });

    const { caption = '', privacy = 'everyone', allowedViewers } = req.body;
    const isVideo    = req.file.mimetype.startsWith('video/');
    const mediaType  = isVideo ? 'video' : 'image';

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'chat-app/status',
      resource_type: isVideo ? 'video' : 'image',
    });

    const viewers = allowedViewers ? JSON.parse(allowedViewers) : [];

    const status = await Status.create({
      userId:         req.user._id,
      mediaUrl:       result.secure_url,
      mediaPublicId:  result.public_id,
      mediaType,
      caption,
      privacy,
      allowedViewers: viewers,
      duration:       result.duration || null,
      thumbnail:      result.eager?.[0]?.secure_url || '',
    });

    const populated = await Status.findById(status._id).populate('userId', 'name avatar');
    res.status(201).json({ success: true, status: populated });
  } catch (err) {
    console.error('createStatus:', err);
    res.status(500).json({ error: 'Failed to post status.' });
  }
};

/* ── GET /api/status  (feed: my + contacts) ───────────────── */
exports.getFeedStatuses = async (req, res) => {
  try {
    const myId       = req.user._id;
    const contactIds = await getContactIds(myId);
    const now        = new Date();

    const statuses = await Status.find({
      expiresAt: { $gt: now },
      $or: [
        { userId: myId },
        {
          userId: { $in: contactIds },
          $or: [
            { privacy: 'everyone' },
            { privacy: 'contacts' },
            { privacy: 'selected', allowedViewers: myId },
          ],
        },
      ],
    })
      .populate('userId', 'name avatar online')
      .sort({ createdAt: -1 })
      .lean();

    // Group by user
    const map = new Map();
    statuses.forEach(s => {
      const uid = s.userId._id.toString();
      const hasViewed = s.viewers.some(v => v.user.toString() === myId.toString());
      if (!map.has(uid)) {
        map.set(uid, { user: s.userId, statuses: [], hasUnread: false, latestAt: s.createdAt });
      }
      const g = map.get(uid);
      if (!hasViewed && uid !== myId.toString()) g.hasUnread = true;
      g.statuses.push({ ...s, hasViewed, viewerCount: s.viewers.length });
    });

    const result = [...map.values()].sort((a, b) => {
      const aMe = a.user._id.toString() === myId.toString();
      const bMe = b.user._id.toString() === myId.toString();
      if (aMe) return -1; if (bMe) return 1;
      if (a.hasUnread && !b.hasUnread) return -1;
      if (!a.hasUnread && b.hasUnread) return 1;
      return new Date(b.latestAt) - new Date(a.latestAt);
    });

    res.json({ success: true, statusGroups: result });
  } catch (err) {
    console.error('getFeedStatuses:', err);
    res.status(500).json({ error: 'Failed to fetch statuses.' });
  }
};

/* ── GET /api/status/my ───────────────────────────────────── */
exports.getMyStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({ userId: req.user._id, expiresAt: { $gt: new Date() } })
      .populate('viewers.user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, statuses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your statuses.' });
  }
};

/* ── POST /api/status/:id/view ────────────────────────────── */
exports.viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.statusId);
    if (!status) return res.status(404).json({ error: 'Status not found.' });
    if (status.userId.toString() === req.user._id.toString()) return res.json({ success: true });

    const seen = status.viewers.some(v => v.user.toString() === req.user._id.toString());
    if (!seen) {
      status.viewers.push({ user: req.user._id });
      await status.save();
    }
    res.json({ success: true, viewerCount: status.viewers.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark viewed.' });
  }
};

/* ── DELETE /api/status/:id ───────────────────────────────── */
exports.deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.statusId);
    if (!status) return res.status(404).json({ error: 'Not found.' });
    if (status.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized.' });

    if (status.mediaPublicId)
      await deleteFromCloudinary(status.mediaPublicId, status.mediaType).catch(() => {});

    await Status.findByIdAndDelete(req.params.statusId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
};

/* ── GET /api/status/:id/viewers ──────────────────────────── */
exports.getStatusViewers = async (req, res) => {
  try {
    const status = await Status.findById(req.params.statusId)
      .populate('viewers.user', 'name avatar');
    if (!status) return res.status(404).json({ error: 'Not found.' });
    if (status.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized.' });
    res.json({ success: true, viewers: status.viewers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get viewers.' });
  }
};

/* ── GET /api/status/contacts  (for privacy selector) ──────── */
exports.getContacts = async (req, res) => {
  try {
    const contactIds = await getContactIds(req.user._id);
    const contacts   = await User.find({ _id: { $in: contactIds } }).select('name avatar online');
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get contacts.' });
  }
};
