import { create } from 'zustand'
import api from '../utils/api'

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},        // chatId -> Message[]
  typingUsers: {},     // chatId -> [{userId, userName}]
  onlineUsers: {},     // userId -> boolean
  unreadCounts: {},    // chatId -> number
  isLoadingChats: false,
  isLoadingMessages: false,
  messagePagination: {}, // chatId -> {page, hasMore}
  searchQuery: '',
  sidePanel: null,     // 'profile' | 'search' | 'new-chat' | 'group-info'

  // ─── Chats ────────────────────────────────────────────────────────────

  fetchChats: async () => {
    set({ isLoadingChats: true })
    try {
      const { data } = await api.get('/chats')
      const unreadCounts = {}
      data.chats.forEach(c => { unreadCounts[c._id] = c.unreadCount || 0 })
      set({ chats: data.chats, unreadCounts, isLoadingChats: false })
    } catch (err) {
      set({ isLoadingChats: false })
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat })
    if (chat) {
      // Clear unread
      set(state => ({
        unreadCounts: { ...state.unreadCounts, [chat._id]: 0 }
      }))
    }
  },

  addChat: (chat) => {
    set(state => {
      const exists = state.chats.find(c => c._id === chat._id)
      if (exists) return {}
      return { chats: [chat, ...state.chats] }
    })
  },

  updateChat: (chatId, updates) => {
    set(state => ({
      chats: state.chats.map(c => c._id === chatId ? { ...c, ...updates } : c),
      activeChat: state.activeChat?._id === chatId ? { ...state.activeChat, ...updates } : state.activeChat,
    }))
  },

  // ─── Messages ─────────────────────────────────────────────────────────

  fetchMessages: async (chatId, page = 1) => {
    set({ isLoadingMessages: true })
    try {
      const { data } = await api.get(`/messages/${chatId}?page=${page}&limit=30`)
      // Normalize chatId on all messages to string
      const normalizedMessages = data.messages.map(m => ({
        ...m,
        chatId: typeof m.chatId === 'object' ? (m.chatId?._id || m.chatId?.toString() || chatId) : (m.chatId || chatId)
      }))
      set(state => {
        const existing = state.messages[chatId] || []
        const newMessages = page === 1 ? normalizedMessages : [...normalizedMessages, ...existing]
        return {
          messages: { ...state.messages, [chatId]: newMessages },
          messagePagination: {
            ...state.messagePagination,
            [chatId]: { page, hasMore: data.pagination.hasMore },
          },
          isLoadingMessages: false,
        }
      })
    } catch (err) {
      set({ isLoadingMessages: false })
    }
  },

  loadMoreMessages: async (chatId) => {
    const { messagePagination } = get()
    const current = messagePagination[chatId]
    if (!current?.hasMore) return
    await get().fetchMessages(chatId, current.page + 1)
  },

  addMessage: (message) => {
    // chatId can be an ObjectId object or a string
    const chatId = typeof message.chatId === 'object' && message.chatId !== null
      ? (message.chatId._id || message.chatId.toString())
      : message.chatId

    set(state => {
      const existing = state.messages[chatId] || []
      // Avoid duplicates by _id
      if (existing.find(m => m._id === message._id)) return {}
      // Also remove optimistic temp message if this is the real one coming back
      // (temp messages have numeric string IDs, real ones are MongoDB ObjectIds)
      const withoutTemp = existing.filter(m => {
        if (message.tempId && m._id === message.tempId) return false
        return true
      })
      const newMessages = [...withoutTemp, message]
      return { messages: { ...state.messages, [chatId]: newMessages } }
    })

    // Update last message in chat list
    get().updateChatLastMessage(chatId, message)
  },

  updateMessage: (messageId, updates) => {
    set(state => {
      const newMessages = {}
      Object.keys(state.messages).forEach(chatId => {
        newMessages[chatId] = state.messages[chatId].map(m =>
          m._id === messageId ? { ...m, ...updates } : m
        )
      })
      return { messages: newMessages }
    })
  },

  removeMessage: (messageId, deleteForEveryone, userId) => {
    set(state => {
      const newMessages = {}
      Object.keys(state.messages).forEach(chatId => {
        newMessages[chatId] = deleteForEveryone
          ? state.messages[chatId].map(m =>
              m._id === messageId
                ? { ...m, deletedForEveryone: true, message: 'This message was deleted' }
                : m
            )
          : state.messages[chatId].filter(m => m._id !== messageId)
      })
      return { messages: newMessages }
    })
  },

  updateChatLastMessage: (chatId, message) => {
    set(state => ({
      chats: state.chats
        .map(c => c._id === chatId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    }))
  },

  // ─── Typing ───────────────────────────────────────────────────────────

  setTyping: (chatId, userId, userName, isTyping) => {
    set(state => {
      const current = state.typingUsers[chatId] || []
      let updated
      if (isTyping) {
        const exists = current.find(u => u.userId === userId)
        updated = exists ? current : [...current, { userId, userName }]
      } else {
        updated = current.filter(u => u.userId !== userId)
      }
      return { typingUsers: { ...state.typingUsers, [chatId]: updated } }
    })
  },

  // ─── Online Status ────────────────────────────────────────────────────

  setUserOnline: (userId, online, lastSeen) => {
    set(state => ({
      onlineUsers: { ...state.onlineUsers, [userId]: online },
      chats: state.chats.map(c => ({
        ...c,
        participants: c.participants?.map(p =>
          p._id === userId ? { ...p, online, lastSeen: lastSeen || p.lastSeen } : p
        ),
      })),
      activeChat: state.activeChat ? {
        ...state.activeChat,
        participants: state.activeChat.participants?.map(p =>
          p._id === userId ? { ...p, online, lastSeen: lastSeen || p.lastSeen } : p
        ),
      } : null,
    }))
  },

  // ─── Unread ───────────────────────────────────────────────────────────

  incrementUnread: (chatId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    }))
  },

  // ─── UI State ─────────────────────────────────────────────────────────

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSidePanel: (panel) => set({ sidePanel: panel }),

  // ─── Reactions ────────────────────────────────────────────────────────

  updateReactions: (messageId, reactions) => {
    get().updateMessage(messageId, { reactions })
  },
}))
