const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Verify user is in chat
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ error: 'Not authorized.' });

    const messages = await Message.find({
      chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar')
      .populate('replyTo')
      .populate('forwardedFrom');

    const total = await Message.countDocuments({
      chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: false,
    });

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages.' });
  }
};

// @desc    Send message
// @route   POST /api/messages/
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, message, messageType = 'text', replyTo, forwardedFrom } = req.body;

    // Verify user is in chat
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(403).json({ error: 'Not authorized.' });

    let mediaUrl = '';
    let mediaPublicId = '';
    let mediaSize = 0;
    let mediaName = '';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: `chat-app/media/${messageType}`,
        resource_type: 'auto',
      });
      mediaUrl = result.secure_url;
      mediaPublicId = result.public_id;
      mediaSize = req.file.size;
      mediaName = req.file.originalname;
    }

    const newMessage = await Message.create({
      chatId,
      senderId: req.user._id,
      message: message || '',
      messageType,
      mediaUrl,
      mediaPublicId,
      mediaSize,
      mediaName,
      replyTo: replyTo || null,
      forwardedFrom: forwardedFrom || null,
      deliveredTo: [{ user: req.user._id }],
    });

    // Update chat's lastMessage
    await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name avatar')
      .populate('replyTo')
      .populate('forwardedFrom');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};

// @desc    Edit message
// @route   PUT /api/messages/:messageId
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });
    if (msg.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    if (msg.messageType !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited.' });
    }

    msg.message = message;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const updatedMsg = await Message.findById(messageId).populate('senderId', 'name avatar');
    res.json({ success: true, message: updatedMsg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message.' });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:messageId
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    if (deleteForEveryone) {
      if (msg.senderId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized.' });
      }
      msg.deletedForEveryone = true;
      msg.message = 'This message was deleted';
      msg.mediaUrl = '';
    } else {
      msg.deletedFor.push(req.user._id);
    }

    await msg.save();
    res.json({ success: true, deleteForEveryone: !!deleteForEveryone });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message.' });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/:messageId/react
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    // Remove existing reaction by this user
    msg.reactions = msg.reactions.map((r) => ({
      ...r.toObject(),
      users: r.users.filter((u) => u.toString() !== req.user._id.toString()),
    })).filter((r) => r.users.length > 0);

    // Add new reaction
    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      existing.users.push(req.user._id);
    } else {
      msg.reactions.push({ emoji, users: [req.user._id] });
    }

    await msg.save();
    const updatedMsg = await Message.findById(messageId).populate('senderId', 'name avatar');
    res.json({ success: true, message: updatedMsg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction.' });
  }
};

// @desc    Mark messages as seen
// @route   POST /api/messages/:chatId/seen
exports.markAsSeen = async (req, res) => {
  try {
    const { chatId } = req.params;

    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: req.user._id },
        'seenBy.user': { $ne: req.user._id },
      },
      {
        $addToSet: { seenBy: { user: req.user._id, seenAt: new Date() } },
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as seen.' });
  }
};

// @desc    Search messages in a chat
// @route   GET /api/messages/:chatId/search
exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;

    if (!q || q.length < 2) return res.json({ success: true, messages: [] });

    const messages = await Message.find({
      chatId,
      message: { $regex: q, $options: 'i' },
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: 'Search failed.' });
  }
};

// @desc    Forward message to multiple chats
// @route   POST /api/messages/forward
exports.forwardMessage = async (req, res) => {
  try {
    const { messageId, chatIds } = req.body;

    const originalMsg = await Message.findById(messageId);
    if (!originalMsg) return res.status(404).json({ error: 'Message not found.' });

    const forwardedMessages = [];
    for (const chatId of chatIds) {
      const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
      if (!chat) continue;

      const newMsg = await Message.create({
        chatId,
        senderId: req.user._id,
        message: originalMsg.message,
        messageType: originalMsg.messageType,
        mediaUrl: originalMsg.mediaUrl,
        forwardedFrom: messageId,
        deliveredTo: [{ user: req.user._id }],
      });

      await Chat.findByIdAndUpdate(chatId, { lastMessage: newMsg._id });
      const populated = await Message.findById(newMsg._id).populate('senderId', 'name avatar');
      forwardedMessages.push(populated);
    }

    res.json({ success: true, messages: forwardedMessages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to forward message.' });
  }
};
