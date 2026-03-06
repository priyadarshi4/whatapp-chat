const { verifySocketToken } = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { redisSet, redisGet, redisDel, redisSadd, redisSrem, redisSmembers } = require('../config/redis');
const { sendPushToUser } = require('../utils/webPush');

// In-memory fallback for socket tracking
const onlineUsers = new Map(); // userId -> Set of socketIds
const typingUsers = new Map(); // chatId -> Set of userIds

const initializeSocket = (io) => {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const user = await verifySocketToken(token);
      if (!user) return next(new Error('Invalid token'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update online status
    await User.findByIdAndUpdate(userId, { online: true });
    await redisSet(`online:${userId}`, true);

    // Broadcast online status to all users in same chats
    const userChats = await Chat.find({ participants: userId }).select('participants');
    const chatRooms = userChats.map((c) => c._id.toString());

    chatRooms.forEach((chatId) => {
      socket.join(chatId);
    });

    // Notify others user is online
    io.emit('user:online', { userId, online: true });

    // ─── Messaging Events ────────────────────────────────────────────────

    socket.on('message:send', async (data) => {
      try {
        const { chatId, message, messageType = 'text', replyTo, tempId, existingMessageId } = data;

        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) return;

        let populated;

        // If message was already saved via REST (media upload), just broadcast it
        if (existingMessageId) {
          populated = await Message.findById(existingMessageId)
            .populate('senderId', 'name avatar')
            .populate('replyTo');
        } else {
          const newMessage = await Message.create({
            chatId,
            senderId: userId,
            message: message || '',
            messageType,
            replyTo: replyTo || null,
            deliveredTo: [{ user: userId }],
          });

          await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

          populated = await Message.findById(newMessage._id)
            .populate('senderId', 'name avatar')
            .populate('replyTo');
        }

        const chatIdStr = chatId.toString();

        // Emit to all in chat (including sender so optimistic msg can be replaced)
        io.to(chatIdStr).emit('message:received', {
          message: { ...populated.toObject(), chatId: chatIdStr },
          tempId,
          chatId: chatIdStr,
        });

        // Mark as delivered for online recipients + push notify offline ones
        const recipientIds = chat.participants
          .map((p) => p.toString())
          .filter((id) => id !== userId);

        for (const recipientId of recipientIds) {
          if (onlineUsers.has(recipientId)) {
            // User is online — mark delivered
            await Message.findByIdAndUpdate(populated._id, {
              $addToSet: { deliveredTo: { user: recipientId } },
            });
            io.to(chatIdStr).emit('message:delivered', {
              messageId: populated._id,
              chatId: chatIdStr,
            });
          } else {
            // User is OFFLINE — send push notification
            try {
              const recipientUser = await User.findById(recipientId).select('name pushSubscription');
              if (recipientUser?.pushSubscription) {
                const senderName = populated.senderId?.name || 'Someone';
                const chatName = chat.isGroup ? (chat.groupName || 'Group') : senderName;

                let bodyText;
                switch (populated.messageType) {
                  case 'image':    bodyText = '📷 Photo'; break;
                  case 'video':    bodyText = '🎥 Video'; break;
                  case 'audio':    bodyText = '🎙️ Voice message'; break;
                  case 'document': bodyText = '📄 Document'; break;
                  default:
                    bodyText = populated.message || 'New message';
                    if (bodyText.length > 80) bodyText = bodyText.substring(0, 80) + '…';
                }

                await sendPushToUser(recipientUser, {
                  title: chat.isGroup ? `${senderName} in ${chatName}` : senderName,
                  body: bodyText,
                  icon: populated.senderId?.avatar || '/chat-icon.svg',
                  badge: '/badge-icon.png',
                  tag: `chat-${chatIdStr}`,        // Groups notifications by chat
                  renotify: true,                   // Always vibrate even if same tag
                  data: {
                    chatId: chatIdStr,
                    senderId: userId,
                    url: '/',
                  },
                  actions: [
                    { action: 'open', title: 'Open Chat' },
                    { action: 'dismiss', title: 'Dismiss' },
                  ],
                });
              }
            } catch (pushErr) {
              console.error('Push notification failed for', recipientId, pushErr.message);
            }
          }
        }
      } catch (err) {
        console.error('message:send error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:seen', async ({ chatId }) => {
      try {
        const updatedMessages = await Message.updateMany(
          {
            chatId,
            senderId: { $ne: userId },
            'seenBy.user': { $ne: userId },
          },
          { $addToSet: { seenBy: { user: userId, seenAt: new Date() } } }
        );

        if (updatedMessages.modifiedCount > 0) {
          io.to(chatId).emit('message:seen', { chatId, seenBy: userId });
        }
      } catch (err) {
        console.error('message:seen error:', err);
      }
    });

    socket.on('message:edit', async ({ messageId, message, chatId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.senderId.toString() !== userId) return;

        msg.message = message;
        msg.isEdited = true;
        msg.editedAt = new Date();
        await msg.save();

        io.to(chatId).emit('message:edited', { messageId, message, chatId });
      } catch (err) {
        console.error('message:edit error:', err);
      }
    });

    socket.on('message:delete', async ({ messageId, chatId, deleteForEveryone }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        if (deleteForEveryone && msg.senderId.toString() === userId) {
          msg.deletedForEveryone = true;
          msg.message = 'This message was deleted';
          msg.mediaUrl = '';
          await msg.save();
          io.to(chatId).emit('message:deleted', { messageId, chatId, deleteForEveryone: true });
        } else {
          msg.deletedFor.push(userId);
          await msg.save();
          socket.emit('message:deleted', { messageId, chatId, deleteForEveryone: false });
        }
      } catch (err) {
        console.error('message:delete error:', err);
      }
    });

    socket.on('message:react', async ({ messageId, emoji, chatId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        // Remove previous reaction by user
        msg.reactions = msg.reactions.map((r) => ({
          ...r.toObject(),
          users: r.users.filter((u) => u.toString() !== userId),
        })).filter((r) => r.users.length > 0);

        // Add new reaction
        const existing = msg.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          existing.users.push(userId);
        } else {
          msg.reactions.push({ emoji, users: [userId] });
        }

        await msg.save();
        io.to(chatId).emit('message:reacted', { messageId, reactions: msg.reactions, chatId });
      } catch (err) {
        console.error('message:react error:', err);
      }
    });

    // ─── Typing Events ────────────────────────────────────────────────────

    socket.on('typing:start', ({ chatId }) => {
      if (!typingUsers.has(chatId)) typingUsers.set(chatId, new Set());
      typingUsers.get(chatId).add(userId);

      socket.to(chatId).emit('typing:update', {
        chatId,
        typingUsers: [...typingUsers.get(chatId)],
        userId,
        userName: socket.user.name,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(userId);
      }

      socket.to(chatId).emit('typing:update', {
        chatId,
        typingUsers: typingUsers.has(chatId) ? [...typingUsers.get(chatId)] : [],
        userId,
        userName: socket.user.name,
        isTyping: false,
      });
    });

    // ─── Chat Events ──────────────────────────────────────────────────────

    socket.on('chat:join', (chatId) => {
      socket.join(chatId);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(chatId);
    });

    socket.on('chat:new', (chat) => {
      // Notify all participants of new chat
      chat.participants.forEach((participantId) => {
        if (participantId.toString() !== userId && onlineUsers.has(participantId.toString())) {
          io.to(participantId.toString()).emit('chat:created', chat);
        }
      });
    });

    // ─── WebRTC Signaling ────────────────────────────────────────────────

    socket.on('webrtc:offer', ({ chatId, offer, to }) => {
      socket.to(to).emit('webrtc:offer', { offer, from: userId, chatId });
    });

    socket.on('webrtc:answer', ({ chatId, answer, to }) => {
      socket.to(to).emit('webrtc:answer', { answer, from: userId, chatId });
    });

    socket.on('webrtc:ice-candidate', ({ chatId, candidate, to }) => {
      socket.to(to).emit('webrtc:ice-candidate', { candidate, from: userId, chatId });
    });

    socket.on('call:incoming', ({ to, from, chatId, callType }) => {
      io.to(to).emit('call:incoming', { from, chatId, callType, caller: socket.user });
    });

    socket.on('call:accept', ({ to, chatId }) => {
      io.to(to).emit('call:accepted', { from: userId, chatId });
    });

    socket.on('call:decline', ({ to, chatId }) => {
      io.to(to).emit('call:declined', { from: userId, chatId });
    });

    socket.on('call:end', ({ to, chatId }) => {
      io.to(to).emit('call:ended', { from: userId, chatId });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.name}`);

      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);

          // Update offline status
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, { online: false, lastSeen });
          await redisDel(`online:${userId}`);

          // Notify others
          io.emit('user:offline', { userId, lastSeen });
        }
      }

      // Remove from typing
      typingUsers.forEach((users, chatId) => {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(chatId).emit('typing:update', {
            chatId,
            typingUsers: [...users],
            userId,
            isTyping: false,
          });
        }
      });
    });
  });
};

module.exports = { initializeSocket };
