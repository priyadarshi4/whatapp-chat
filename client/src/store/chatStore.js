import { create } from 'zustand';
import api from '../utils/api';

const useChatStore = create((set, get) => ({
  chat: null,
  messages: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  page: 1,
  typingUsers: new Set(),
  unreadCount: 0,
  replyingTo: null,

  loadChat: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/chats');
      if (data.chats.length > 0) {
        set({ chat: data.chats[0], loading: false });
        await get().loadMessages(data.chats[0]._id, 1, true);
      } else { set({ loading: false }); }
    } catch (_) { set({ loading: false }); }
  },

  loadMessages: async (chatId, page = 1, reset = false) => {
    if (reset) set({ loadingMore: true });
    try {
      const { data } = await api.get(`/messages/${chatId}?page=${page}&limit=50`);
      set((s) => ({
        messages: reset ? data.messages : [...data.messages, ...s.messages],
        page, hasMore: data.messages.length === 50, loadingMore: false, loading: false,
      }));
      return data.messages;
    } catch (_) { set({ loadingMore: false, loading: false }); return []; }
  },

  loadMore: async () => {
    const { chat, page, hasMore, loadingMore } = get();
    if (!chat || !hasMore || loadingMore) return;
    set({ loadingMore: true });
    await get().loadMessages(chat._id, page + 1, false);
    set((s) => ({ page: s.page + 1 }));
  },

  addMessage: (msg) => {
    set((s) => {
      const exists = s.messages.some(m => m._id === msg._id || (msg.tempId && m.tempId === msg.tempId));
      if (exists) return { messages: s.messages.map(m => m.tempId === msg.tempId ? { ...msg } : m) };
      return { messages: [...s.messages, msg] };
    });
  },

  deleteMessage: (messageId, deleteFor) => {
    set((s) => ({
      messages: deleteFor === 'everyone'
        ? s.messages.map(m => m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m)
        : s.messages.filter(m => m._id !== messageId),
    }));
  },

  updateMessageReactions: (messageId, reactions) => {
    set((s) => ({ messages: s.messages.map(m => m._id === messageId ? { ...m, reactions } : m) }));
  },

  updateMessagePin: (messageId, isPinned) => {
    set((s) => ({ messages: s.messages.map(m => m._id === messageId ? { ...m, isPinned } : m) }));
  },

  updateDeliveryBulk: (status) => {
    set((s) => ({
      messages: s.messages.map(m =>
        (status === 'read' && (m.deliveryStatus === 'sent' || m.deliveryStatus === 'delivered')) ||
        (status === 'delivered' && m.deliveryStatus === 'sent')
          ? { ...m, deliveryStatus: status } : m
      ),
    }));
  },

  markRead: async () => {
    const { chat } = get();
    if (!chat) return;
    try {
      await api.patch(`/messages/${chat._id}/read`);
      set({ unreadCount: 0 });
    } catch (_) {}
  },

  setTyping: (userId, isTyping) => {
    set((s) => {
      const next = new Set(s.typingUsers);
      if (isTyping) next.add(userId); else next.delete(userId);
      return { typingUsers: next };
    });
  },

  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setReplyingTo: (message) => set({ replyingTo: message }),
  clearReplyingTo: () => set({ replyingTo: null }),

  sendMessage: async (content, type = 'text', extra = {}) => {
    const { chat, replyingTo } = get();
    if (!chat) return;
    const tempId = `temp-${Date.now()}`;
    const replyToId = replyingTo?._id;
    const tempMsg = {
      _id: tempId, tempId, chatId: chat._id, content, type,
      senderId: { _id: 'me', username: 'me' },
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending', reactions: [],
      replyTo: replyingTo || null, ...extra,
    };
    get().addMessage(tempMsg);
    get().clearReplyingTo();

    const socketModule = await import('../utils/socket');
    const socket = socketModule.getSocket();
    const payload = { chatId: chat._id, content, type, tempId, replyTo: replyToId, ...extra };

    if (socket?.connected) {
      socket.emit('message:send', payload, (res) => {
        if (res?.success) {
          set((s) => ({ messages: s.messages.map(m => m.tempId === tempId ? { ...res.message, tempId } : m) }));
        }
      });
    } else {
      try {
        const { data } = await api.post('/messages', { chatId: chat._id, content, type, replyTo: replyToId, ...extra });
        set((s) => ({ messages: s.messages.map(m => m.tempId === tempId ? data.message : m) }));
      } catch (_) {}
    }
  },
}));

export default useChatStore;
