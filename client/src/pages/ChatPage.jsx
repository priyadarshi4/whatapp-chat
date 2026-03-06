import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { getSocket } from '../socket/socket'
import Sidebar from '../components/sidebar/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'

export default function ChatPage() {
  const { user } = useAuthStore()
  const {
    activeChat,
    fetchChats,
    addMessage,
    updateMessage,
    removeMessage,
    setTyping,
    setUserOnline,
    updateReactions,
    addChat,
    updateChatLastMessage,
    incrementUnread,
  } = useChatStore()

  const notificationSound = useRef(null)

  useEffect(() => {
    fetchChats()

    // Handle notification click → open the correct chat
    const handleOpenChat = async (event) => {
      const { chatId } = event.detail
      if (!chatId) return

      // Find chat in existing list or fetch it
      const { chats, fetchChats: refetch, setActiveChat, fetchMessages } = useChatStore.getState()
      let chat = chats.find(c => c._id === chatId)

      if (!chat) {
        await refetch()
        chat = useChatStore.getState().chats.find(c => c._id === chatId)
      }

      if (chat) {
        setActiveChat(chat)
        fetchMessages(chatId, 1)
        const socket = getSocket()
        socket?.emit('chat:join', chatId)
      }
    }

    window.addEventListener('sw:open-chat', handleOpenChat)
    return () => window.removeEventListener('sw:open-chat', handleOpenChat)
  }, [])

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // New message received
    socket.on('message:received', ({ message, tempId, chatId }) => {
      // Normalize chatId to string
      const normalizedChatId = typeof chatId === 'object' ? chatId.toString() : chatId
      const normalizedMessage = {
        ...message,
        chatId: normalizedChatId,
        tempId, // pass along so addMessage can remove optimistic version
      }

      // If this message was sent by current user, replace the optimistic entry
      const { messages } = useChatStore.getState()
      if (tempId && message.senderId?._id === user._id) {
        // Remove optimistic message first, then add real one
        useChatStore.setState(state => {
          const chatMessages = state.messages[normalizedChatId] || []
          const filtered = chatMessages.filter(m => m._id !== tempId)
          // avoid duplicate if already added
          if (filtered.find(m => m._id === message._id)) return {}
          return {
            messages: {
              ...state.messages,
              [normalizedChatId]: [...filtered, normalizedMessage],
            }
          }
        })
        useChatStore.getState().updateChatLastMessage(normalizedChatId, normalizedMessage)
        return
      }

      addMessage(normalizedMessage)

      // Increment unread if not in active chat
      if (message.senderId?._id !== user._id) {
        const { activeChat } = useChatStore.getState()
        if (!activeChat || activeChat._id !== normalizedChatId) {
          incrementUnread(normalizedChatId)
          // Play sound
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.3
            audio.play().catch(() => {})
          } catch {}
          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification(`${message.senderId?.name || 'New message'}`, {
              body: message.messageType === 'text' ? message.message : `Sent a ${message.messageType}`,
              icon: message.senderId?.avatar || '/chat-icon.svg',
            })
          }
        }
      }
    })

    socket.on('message:edited', ({ messageId, message }) => {
      updateMessage(messageId, { message, isEdited: true })
    })

    socket.on('message:deleted', ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        updateMessage(messageId, { deletedForEveryone: true, message: 'This message was deleted', mediaUrl: '' })
      } else {
        removeMessage(messageId, false, user._id)
      }
    })

    socket.on('message:reacted', ({ messageId, reactions }) => {
      updateReactions(messageId, reactions)
    })

    socket.on('message:seen', ({ chatId, seenBy }) => {
      // Update seen status for messages in chat
      const { messages } = useChatStore.getState()
      const chatMessages = messages[chatId] || []
      chatMessages.forEach(msg => {
        if (msg.senderId._id === user._id && !msg.seenBy?.find(s => s.user === seenBy)) {
          updateMessage(msg._id, {
            seenBy: [...(msg.seenBy || []), { user: seenBy, seenAt: new Date() }]
          })
        }
      })
    })

    socket.on('message:delivered', ({ messageId }) => {
      updateMessage(messageId, { delivered: true })
    })

    socket.on('typing:update', ({ chatId, userId, userName, isTyping }) => {
      if (userId !== user._id) {
        setTyping(chatId, userId, userName, isTyping)
      }
    })

    socket.on('user:online', ({ userId }) => {
      if (userId !== user._id) setUserOnline(userId, true)
    })

    socket.on('user:offline', ({ userId, lastSeen }) => {
      if (userId !== user._id) setUserOnline(userId, false, lastSeen)
    })

    socket.on('chat:created', (chat) => {
      addChat(chat)
    })

    return () => {
      socket.off('message:received')
      socket.off('message:edited')
      socket.off('message:deleted')
      socket.off('message:reacted')
      socket.off('message:seen')
      socket.off('message:delivered')
      socket.off('typing:update')
      socket.off('user:online')
      socket.off('user:offline')
      socket.off('chat:created')
    }
  }, [user])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-chat-bg">
      <Sidebar />
      <div className="flex-1 flex">
        {activeChat ? <ChatWindow /> : <WelcomeScreen />}
      </div>
    </div>
  )
}
