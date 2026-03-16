const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatModel = require('../models/Chat');
const { sendPushNotification } = require('../utils/webPush');

const onlineUsers = new Map(); // userId -> socketId

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'couple-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) { next(new Error('Auth failed')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date(), offlineUnreadCount: 0 });
    io.emit('user:online', { userId, isOnline: true });

    // Mark undelivered messages as delivered on connect
    try {
      const user = await User.findById(userId);
      if (user?.partnerId) {
        const chat = await ChatModel.findOne({ participants: { $all: [userId, user.partnerId] } });
        if (chat) {
          const result = await Message.updateMany(
            { chatId: chat._id, senderId: user.partnerId, deliveryStatus: 'sent' },
            { deliveryStatus: 'delivered', deliveredAt: new Date() }
          );
          if (result.modifiedCount > 0) {
            const partnerSocket = onlineUsers.get(user.partnerId.toString());
            if (partnerSocket) {
              io.to(partnerSocket).emit('message:delivered_bulk', { chatId: chat._id.toString(), deliveredAt: new Date().toISOString() });
            }
          }
        }
      }
    } catch (e) {}

    socket.on('chat:join', (chatId) => socket.join(`chat:${chatId}`));
    socket.on('chat:leave', (chatId) => socket.leave(`chat:${chatId}`));

    // SEND MESSAGE
    socket.on('message:send', async (data, callback) => {
      try {
        const { chatId, content, type = 'text', mediaUrl, gifUrl, songData, unlockAt, replyTo, tempId, location, fileName, fileSize, fileMime } = data;
        const isUnlocked = !unlockAt || new Date(unlockAt) <= new Date();
        const user = await User.findById(userId);
        const partnerOnline = user?.partnerId && onlineUsers.has(user.partnerId.toString());
        const deliveryStatus = partnerOnline ? 'delivered' : 'sent';

        const msg = new Message({
          chatId, senderId: userId, content, type, mediaUrl, gifUrl,
          songData, location, fileName, fileSize, fileMime,
          unlockAt: unlockAt ? new Date(unlockAt) : undefined,
          isUnlocked, replyTo: replyTo || undefined,
          deliveryStatus, deliveredAt: partnerOnline ? new Date() : undefined,
        });
        await msg.save();
        await ChatModel.findByIdAndUpdate(chatId, { lastMessage: msg._id, lastMessageAt: new Date() });
        await msg.populate('senderId', 'username avatar');
        if (replyTo) await msg.populate({ path: 'replyTo', select: 'content senderId type mediaUrl', populate: { path: 'senderId', select: 'username avatar' } });

        const msgData = { ...msg.toJSON(), tempId };
        io.to(`chat:${chatId}`).emit('message:new', msgData);

        // Push + offline count if partner offline
        if (!partnerOnline && user?.partnerId) {
          await User.findByIdAndUpdate(user.partnerId, { $inc: { offlineUnreadCount: 1 } });
          const partner = await User.findById(user.partnerId);
          if (partner?.pushSubscription?.endpoint) {
            try {
              const bodyText = type === 'image' ? '📷 Photo' : type === 'gif' ? '🎬 GIF' : type === 'voice_note' ? '🎤 Voice note' : type === 'hug' ? '🤗 Sent you a hug!' : (content || 'New message ❤️');
              await sendPushNotification(partner.pushSubscription, {
                title: user.username, body: bodyText, icon: '/favicon.svg', data: { url: '/' }
              });
            } catch (_) {}
          }
        }

        if (callback) callback({ success: true, message: msgData });
      } catch (err) { if (callback) callback({ success: false, error: err.message }); }
    });

    // DELETE MESSAGE
    socket.on('message:delete', async ({ messageId, chatId, deleteFor }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        if (deleteFor === 'everyone') {
          msg.deletedForEveryone = true;
          msg.content = 'This message was deleted';
          msg.mediaUrl = undefined;
          msg.gifUrl = undefined;
          msg.type = 'text';
          await msg.save();
          io.to(`chat:${chatId}`).emit('message:deleted', { messageId, deleteFor: 'everyone' });
        } else {
          // delete for me — just notify sender's socket
          msg.isDeleted = true;
          await msg.save();
          socket.emit('message:deleted', { messageId, deleteFor: 'me' });
        }
      } catch (_) {}
    });

    // TYPING
    socket.on('typing:start', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing:start', { userId, chatId }));
    socket.on('typing:stop', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing:stop', { userId, chatId }));

    // READ
    socket.on('message:read', async ({ chatId }) => {
      try {
        await Message.updateMany(
          { chatId, senderId: { $ne: userId }, deliveryStatus: { $in: ['sent', 'delivered'] } },
          { deliveryStatus: 'read', isRead: true, readAt: new Date() }
        );
        socket.to(`chat:${chatId}`).emit('message:read_bulk', { chatId, readBy: userId, readAt: new Date().toISOString() });
      } catch (_) {}
    });

    // REACTIONS
    socket.on('message:react', async ({ messageId, emoji, chatId }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const existing = msg.reactions.find(r => r.userId.toString() === userId);
      if (existing) {
        if (existing.emoji === emoji) msg.reactions = msg.reactions.filter(r => r.userId.toString() !== userId);
        else existing.emoji = emoji;
      } else { msg.reactions.push({ userId, emoji }); }
      await msg.save();
      io.to(`chat:${chatId}`).emit('message:reacted', { messageId, reactions: msg.reactions });
    });

    // HUG animation
    socket.on('send:hug', async ({ chatId, partnerId }) => {
      const partnerSocket = onlineUsers.get(partnerId);
      if (partnerSocket) io.to(partnerSocket).emit('receive:hug', { from: socket.user });
    });

    // LIVE LOCATION update
    socket.on('location:update', ({ chatId, lat, lng }) => {
      socket.to(`chat:${chatId}`).emit('location:updated', { userId, lat, lng });
    });

    // DRAW TOGETHER events
    socket.on('draw:stroke', ({ chatId, stroke }) => {
      socket.to(`chat:${chatId}`).emit('draw:stroke', { stroke });
    });
    socket.on('draw:clear', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('draw:clear');
    });
    socket.on('draw:undo', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('draw:undo');
    });

    // COUPLE ROOM events
    socket.on('room:join', (roomId) => socket.join(`room:${roomId}`));
    socket.on('room:video_state', ({ roomId, playing, time }) => {
      socket.to(`room:${roomId}`).emit('room:video_state', { playing, time });
    });
    socket.on('room:animation', ({ roomId, type }) => {
      io.to(`room:${roomId}`).emit('room:animation', { type, from: userId });
    });

    // MOOD
    socket.on('mood:update', async ({ mood }) => {
      await User.findByIdAndUpdate(userId, { mood, moodUpdatedAt: new Date() });
      socket.broadcast.emit('mood:updated', { userId, mood });
    });

    // CALLS
    socket.on('call:offer', ({ to, offer, callType }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:incoming', { from: userId, offer, callType, caller: socket.user });
    });
    socket.on('call:answer', ({ to, answer }) => {
      const s = onlineUsers.get(to); if (s) io.to(s).emit('call:answered', { from: userId, answer });
    });
    socket.on('call:ice', ({ to, candidate }) => {
      const s = onlineUsers.get(to); if (s) io.to(s).emit('call:ice', { from: userId, candidate });
    });
    socket.on('call:end', ({ to }) => {
      const s = onlineUsers.get(to); if (s) io.to(s).emit('call:ended', { from: userId });
    });

    // MESSAGE DELIVERED_BULK acknowledgement  
    socket.on('message:delivered_bulk', () => {});

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit('user:online', { userId, isOnline: false, lastSeen: new Date() });
    });
  });

  // MIDNIGHT ROMANTIC MESSAGE — runs every minute, fires at 00:00
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      sendMidnightMessage(io);
    }
  }, 60000);
};

async function sendMidnightMessage(io) {
  const messages = [
    "🌙 Another day with you begins... I fall for you all over again at midnight 💕",
    "✨ It's a new day and my first thought is you. Good midnight, my love 💗",
    "🌟 While the world sleeps, my heart whispers your name 🥰",
    "💫 Midnight means it's officially a new day to love you even more ❤️",
    "🌹 The stars are jealous of how bright you make my world 💕",
    "🎵 If love had a soundtrack, you'd be every song 🎶",
    "💌 12AM reminder: You are deeply loved, always 🌙",
  ];
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];

  try {
    const chats = await ChatModel.find({ isCouple: true });
    for (const chat of chats) {
      const system = new Message({
        chatId: chat._id,
        senderId: chat.participants[0],
        content: randomMsg,
        type: 'midnight_message',
        deliveryStatus: 'sent',
      });
      await system.save();
      io.to(`chat:${chat._id}`).emit('message:new', system.toJSON());
    }
  } catch (_) {}
}

module.exports = { initializeSocket };
