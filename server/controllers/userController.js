const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get user by ID
// @route   GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -blockedUsers');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user.' });
  }
};

// @desc    Search users
// @route   GET /api/users/search?q=query
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      blockedUsers: { $ne: req.user._id },
    })
      .select('name email avatar bio online lastSeen')
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed.' });
  }
};

// @desc    Update profile
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;

    if (req.file) {
      // Upload avatar to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'chat-app/avatars',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      });

      // Delete old avatar if exists
      const currentUser = await User.findById(req.user._id);
      if (currentUser.avatarPublicId) {
        await deleteFromCloudinary(currentUser.avatarPublicId).catch(console.warn);
      }

      updates.avatar = result.secure_url;
      updates.avatarPublicId = result.public_id;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// @desc    Update online status
// @route   PUT /api/users/status
exports.updateStatus = async (req, res) => {
  try {
    const { online } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { online, lastSeen: online ? req.user.lastSeen : new Date() },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
};

// @desc    Block user
// @route   POST /api/users/block/:id
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (user.blockedUsers.includes(id)) {
      return res.status(400).json({ error: 'User already blocked.' });
    }

    user.blockedUsers.push(id);
    await user.save();

    res.json({ success: true, message: 'User blocked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user.' });
  }
};

// @desc    Unblock user
// @route   POST /api/users/unblock/:id
exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: id } });
    res.json({ success: true, message: 'User unblocked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user.' });
  }
};

// @desc    Pin/Unpin chat
// @route   POST /api/users/pin-chat/:chatId
exports.togglePinChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const user = await User.findById(req.user._id);

    const isPinned = user.pinnedChats.includes(chatId);
    if (isPinned) {
      user.pinnedChats = user.pinnedChats.filter((id) => id.toString() !== chatId);
    } else {
      if (user.pinnedChats.length >= 3) {
        return res.status(400).json({ error: 'Maximum 3 chats can be pinned.' });
      }
      user.pinnedChats.push(chatId);
    }

    await user.save();
    res.json({ success: true, pinned: !isPinned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle pin.' });
  }
};

// @desc    Star/Unstar message
// @route   POST /api/users/star-message/:messageId
exports.toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user._id);

    const isStarred = user.starredMessages.includes(messageId);
    if (isStarred) {
      user.starredMessages = user.starredMessages.filter((id) => id.toString() !== messageId);
    } else {
      user.starredMessages.push(messageId);
    }

    await user.save();
    res.json({ success: true, starred: !isStarred });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle star.' });
  }
};

// @desc    Get starred messages
// @route   GET /api/users/starred-messages
exports.getStarredMessages = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'starredMessages',
      populate: { path: 'senderId', select: 'name avatar' },
    });

    res.json({ success: true, messages: user.starredMessages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get starred messages.' });
  }
};
