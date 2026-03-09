const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatModel = require('../models/Chat');
const { sendPushNotification } = require('../utils/webPush');

const onlineUsers = new Map();

const initializeSocket = (io) => {

  // AUTH MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'couple-secret-key'
      );

      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', async (socket) => {

    const userId = socket.userId;

    console.log("🟢 User connected:", userId);

    onlineUsers.set(userId, socket.id);

    // mark user online
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    io.emit('user:online', { userId, isOnline: true });

    // MARK OLD MESSAGES DELIVERED
    try {

      const user = await User.findById(userId);

      if (user?.partnerId) {

        const chat = await ChatModel.findOne({
          participants: { $all: [userId, user.partnerId] }
        });

        if (chat) {

          const messages = await Message.updateMany(
            {
              chatId: chat._id,
              senderId: user.partnerId,
              deliveryStatus: 'sent'
            },
            {
              deliveryStatus: 'delivered',
              deliveredAt: new Date()
            }
          );

          if (messages.modifiedCount > 0) {

            const partnerSocket = onlineUsers.get(
              user.partnerId.toString()
            );

            if (partnerSocket) {

              io.to(partnerSocket).emit(
                'message:delivered_bulk',
                {
                  chatId: chat._id.toString(),
                  deliveredAt: new Date().toISOString()
                }
              );

            }
          }
        }
      }

    } catch (err) {
      console.log("delivery error", err);
    }


    // JOIN CHAT ROOM
    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });


    // SEND MESSAGE
    socket.on('message:send', async (data, callback) => {

      try {

        const {
          chatId,
          content,
          type = 'text',
          mediaUrl,
          songData,
          unlockAt,
          replyTo,
          tempId
        } = data;

        const isUnlocked =
          !unlockAt || new Date(unlockAt) <= new Date();

        const user = await User.findById(userId);

        const partnerOnline =
          user?.partnerId &&
          onlineUsers.has(user.partnerId.toString());

        const deliveryStatus = partnerOnline
          ? 'delivered'
          : 'sent';

        const msg = new Message({
          chatId,
          senderId: userId,
          content,
          type,
          mediaUrl,
          songData,
          unlockAt: unlockAt ? new Date(unlockAt) : undefined,
          isUnlocked,
          replyTo: replyTo || undefined,
          deliveryStatus,
          deliveredAt: partnerOnline ? new Date() : undefined
        });

        await msg.save();

        await ChatModel.findByIdAndUpdate(chatId, {
          lastMessage: msg._id,
          lastMessageAt: new Date()
        });

        await msg.populate('senderId', 'username avatar');

        if (replyTo) {
          await msg.populate({
            path: 'replyTo',
            select: 'content senderId type mediaUrl',
            populate: {
              path: 'senderId',
              select: 'username avatar'
            }
          });
        }

        const msgData = {
          ...msg.toJSON(),
          tempId
        };

        io.to(`chat:${chatId}`).emit('message:new', msgData);

        // PUSH NOTIFICATION IF OFFLINE
        if (!partnerOnline && user?.partnerId) {

          const partner = await User.findById(user.partnerId);

          if (partner?.pushSubscription) {

            try {

              await sendPushNotification(
                partner.pushSubscription,
                {
                  title: user.username,
                  body: content || "Sent you a message ❤️",
                  icon: "/icon-192.png",
                  data: {
                    url: "/chat"
                  }
                }
              );

            } catch (err) {
              console.log("push error", err);
            }
          }
        }

        if (callback)
          callback({ success: true, message: msgData });

      } catch (err) {

        console.log(err);

        if (callback)
          callback({ success: false, error: err.message });
      }

    });


    // TYPING
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:start', {
        userId,
        chatId
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', {
        userId,
        chatId
      });
    });


    // MESSAGE READ
    socket.on('message:read', async ({ chatId }) => {

      try {

        await Message.updateMany(
          {
            chatId,
            senderId: { $ne: userId },
            deliveryStatus: { $in: ['sent', 'delivered'] }
          },
          {
            deliveryStatus: 'read',
            isRead: true,
            readAt: new Date()
          }
        );

        socket.to(`chat:${chatId}`).emit(
          'message:read_bulk',
          {
            chatId,
            readBy: userId,
            readAt: new Date().toISOString()
          }
        );

      } catch (err) {}
    });


    // REACTIONS
    socket.on('message:react', async ({ messageId, emoji, chatId }) => {

      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existing = msg.reactions.find(
        r => r.userId.toString() === userId
      );

      if (existing) {

        if (existing.emoji === emoji)
          msg.reactions = msg.reactions.filter(
            r => r.userId.toString() !== userId
          );
        else
          existing.emoji = emoji;

      } else {

        msg.reactions.push({ userId, emoji });

      }

      await msg.save();

      io.to(`chat:${chatId}`).emit('message:reacted', {
        messageId,
        reactions: msg.reactions
      });

    });


    // USER DISCONNECT
    socket.on('disconnect', async () => {

      console.log("🔴 User disconnected:", userId);

      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      io.emit('user:online', {
        userId,
        isOnline: false,
        lastSeen: new Date()
      });

    });

  });
};

module.exports = { initializeSocket };