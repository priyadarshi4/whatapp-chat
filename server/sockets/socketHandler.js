const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatModel = require('../models/Chat');

const onlineUsers = new Map();

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'couple-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.userId = decoded.userId;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit('user:online', { userId, isOnline: true });

    // FEATURE 6: Mark undelivered messages as delivered when user connects
    try {
      const user = await User.findById(userId);
      if (user && user.partnerId) {
        const chat = await ChatModel.findOne({ participants: { $all: [userId, user.partnerId] } });
        if (chat) {
          const count = await Message.countDocuments({ chatId: chat._id, senderId: user.partnerId, deliveryStatus: 'sent' });
          if (count > 0) {
            await Message.updateMany(
              { chatId: chat._id, senderId: user.partnerId, deliveryStatus: 'sent' },
              { deliveryStatus: 'delivered', deliveredAt: new Date() }
            );
            const partnerSocketId = onlineUsers.get(user.partnerId.toString());
            if (partnerSocketId) {
              io.to(partnerSocketId).emit('message:delivered_bulk', { chatId: chat._id.toString(), deliveredAt: new Date().toISOString() });
            }
          }
        }
      }
    } catch (_) {}

    socket.on('chat:join', (chatId) => { socket.join('chat:' + chatId); });
    socket.on('chat:leave', (chatId) => { socket.leave('chat:' + chatId); });

    // Send message — with delivery status + reply populate
    socket.on('message:send', async (data, callback) => {
      try {
        const { chatId, content, type = 'text', mediaUrl, songData, unlockAt, replyTo, tempId } = data;
        const isUnlocked = !unlockAt || new Date(unlockAt) <= new Date();

        const user = await User.findById(userId);
        const partnerOnline = user && user.partnerId && onlineUsers.has(user.partnerId.toString());
        const initialStatus = partnerOnline ? 'delivered' : 'sent';

        const msg = new Message({
          chatId, senderId: userId, content, type, mediaUrl, songData,
          unlockAt: unlockAt ? new Date(unlockAt) : undefined,
          isUnlocked,
          replyTo: replyTo || undefined,
          deliveryStatus: initialStatus,
          deliveredAt: partnerOnline ? new Date() : undefined,
        });
        await msg.save();
        await ChatModel.findByIdAndUpdate(chatId, { lastMessage: msg._id, lastMessageAt: new Date() });
        await msg.populate('senderId', 'username avatar');
        if (replyTo) {
          await msg.populate({ path: 'replyTo', select: 'content senderId type mediaUrl', populate: { path: 'senderId', select: 'username avatar' } });
        }

        const msgData = Object.assign({}, msg.toJSON(), { tempId });
        io.to('chat:' + chatId).emit('message:new', msgData);
        if (callback) callback({ success: true, message: msgData });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('typing:start', ({ chatId }) => { socket.to('chat:' + chatId).emit('typing:start', { userId, chatId }); });
    socket.on('typing:stop', ({ chatId }) => { socket.to('chat:' + chatId).emit('typing:stop', { userId, chatId }); });

    socket.on('miss_you', async ({ chatId, partnerId }) => {
      const partnerSocketId = onlineUsers.get(partnerId);
      if (partnerSocketId) io.to(partnerSocketId).emit('miss_you', { from: socket.user, chatId });
    });

    // FEATURE 6: Read receipts - blue ticks
    socket.on('message:read', async ({ chatId }) => {
      try {
        await Message.updateMany(
          { chatId, senderId: { $ne: userId }, deliveryStatus: { $in: ['sent', 'delivered'] } },
          { deliveryStatus: 'read', isRead: true, readAt: new Date() }
        );
        socket.to('chat:' + chatId).emit('message:read_bulk', { chatId, readBy: userId, readAt: new Date().toISOString() });
      } catch (_) {}
    });

    socket.on('message:delivered', async ({ messageId, chatId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { deliveryStatus: 'delivered', deliveredAt: new Date() });
        socket.to('chat:' + chatId).emit('message:status_update', { messageId, deliveryStatus: 'delivered', deliveredAt: new Date().toISOString() });
      } catch (_) {}
    });

    socket.on('message:react', async ({ messageId, emoji, chatId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        const existing = msg.reactions.find(r => r.userId.toString() === userId);
        if (existing) {
          if (existing.emoji === emoji) msg.reactions = msg.reactions.filter(r => r.userId.toString() !== userId);
          else existing.emoji = emoji;
        } else {
          msg.reactions.push({ userId, emoji });
        }
        await msg.save();
        io.to('chat:' + chatId).emit('message:reacted', { messageId, reactions: msg.reactions });
      } catch (_) {}
    });

    socket.on('mood:update', async ({ mood }) => {
      await User.findByIdAndUpdate(userId, { mood, moodUpdatedAt: new Date() });
      socket.broadcast.emit('mood:updated', { userId, mood });
    });

    socket.on('call:offer', ({ to, offer, callType }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:incoming', { from: userId, offer, callType, caller: socket.user });
    });
    socket.on('call:answer', ({ to, answer }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:answered', { from: userId, answer });
    });
    socket.on('call:ice', ({ to, candidate }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:ice', { from: userId, candidate });
    });
    socket.on('call:end', ({ to }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:ended', { from: userId });
    });
    socket.on('call:reject', ({ to }) => {
      const s = onlineUsers.get(to);
      if (s) io.to(s).emit('call:rejected', { from: userId });
    });

    socket.on('message:pin', async ({ messageId, chatId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        msg.isPinned = !msg.isPinned;
        msg.pinnedAt = msg.isPinned ? new Date() : undefined;
        await msg.save();
        io.to('chat:' + chatId).emit('message:pinned', { messageId, isPinned: msg.isPinned });
      } catch (_) {}
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit('user:online', { userId, isOnline: false, lastSeen: new Date() });
    });
  });
};

module.exports = { initializeSocket };
