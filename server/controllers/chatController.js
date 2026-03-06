const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Create or get one-to-one chat
// @route   POST /api/chats/
exports.createOrGetChat = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot chat with yourself.' });
    }

    const participant = await User.findById(participantId);
    if (!participant) return res.status(404).json({ error: 'User not found.' });

    // Check if chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 },
    })
      .populate('participants', 'name email avatar bio online lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name avatar' },
      });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, participantId],
        isGroup: false,
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email avatar bio online lastSeen')
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderId', select: 'name avatar' },
        });
    }

    res.status(200).json({ success: true, chat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Failed to create chat.' });
  }
};

// @desc    Get all chats for user
// @route   GET /api/chats/
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'name email avatar bio online lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name avatar' },
      })
      .sort({ updatedAt: -1 });

    // Add unread count for each chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: req.user._id },
          'seenBy.user': { $ne: req.user._id },
          deletedForEveryone: false,
          deletedFor: { $ne: req.user._id },
        });

        return { ...chat.toJSON(), unreadCount };
      })
    );

    res.json({ success: true, chats: chatsWithUnread });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chats.' });
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
exports.createGroupChat = async (req, res) => {
  try {
    const { name, participants, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Group name is required.' });
    if (!participants || participants.length < 2) {
      return res.status(400).json({ error: 'Group must have at least 2 other participants.' });
    }

    const allParticipants = [...new Set([req.user._id.toString(), ...participants])];

    let groupAvatar = '';
    let groupAvatarPublicId = '';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'chat-app/group-avatars',
        transformation: [{ width: 400, height: 400, crop: 'fill' }],
      });
      groupAvatar = result.secure_url;
      groupAvatarPublicId = result.public_id;
    }

    const chat = await Chat.create({
      participants: allParticipants,
      isGroup: true,
      groupName: name,
      groupAdmin: req.user._id,
      groupDescription: description || '',
      groupAvatar,
      groupAvatarPublicId,
    });

    // Create system message
    await Message.create({
      chatId: chat._id,
      senderId: req.user._id,
      message: `${req.user.name} created this group`,
      messageType: 'system',
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatar bio online lastSeen')
      .populate('groupAdmin', 'name email avatar');

    res.status(201).json({ success: true, chat: populatedChat });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group.' });
  }
};

// @desc    Update group
// @route   PUT /api/chats/group/:chatId
exports.updateGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, description } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found.' });
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only admin can update group.' });
    }

    const updates = {};
    if (name) updates.groupName = name;
    if (description !== undefined) updates.groupDescription = description;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'chat-app/group-avatars',
      });
      updates.groupAvatar = result.secure_url;
      updates.groupAvatarPublicId = result.public_id;
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, updates, { new: true })
      .populate('participants', 'name email avatar bio online lastSeen')
      .populate('groupAdmin', 'name email avatar');

    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group.' });
  }
};

// @desc    Add member to group
// @route   POST /api/chats/group/:chatId/add
exports.addGroupMember = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found.' });
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only admin can add members.' });
    }
    if (chat.participants.includes(userId)) {
      return res.status(400).json({ error: 'User already in group.' });
    }

    chat.participants.push(userId);
    await chat.save();

    const newUser = await User.findById(userId).select('name');
    await Message.create({
      chatId: chat._id,
      senderId: req.user._id,
      message: `${req.user.name} added ${newUser.name}`,
      messageType: 'system',
    });

    const updatedChat = await Chat.findById(chatId).populate('participants', 'name email avatar bio online lastSeen');
    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member.' });
  }
};

// @desc    Remove member from group
// @route   POST /api/chats/group/:chatId/remove
exports.removeGroupMember = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found.' });
    if (chat.groupAdmin.toString() !== req.user._id.toString() && userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    chat.participants = chat.participants.filter((p) => p.toString() !== userId);
    await chat.save();

    const removedUser = await User.findById(userId).select('name');
    const isLeave = userId === req.user._id.toString();
    await Message.create({
      chatId: chat._id,
      senderId: req.user._id,
      message: isLeave ? `${req.user.name} left the group` : `${req.user.name} removed ${removedUser?.name}`,
      messageType: 'system',
    });

    const updatedChat = await Chat.findById(chatId).populate('participants', 'name email avatar bio online lastSeen');
    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member.' });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:chatId
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Mark all messages as deleted for this user
    await Message.updateMany({ chatId }, { $addToSet: { deletedFor: req.user._id } });

    res.json({ success: true, message: 'Chat deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat.' });
  }
};
