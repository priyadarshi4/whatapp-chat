import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useStatusStore } from '../store/statusStore'
import { useCallStore } from '../store/callStore'
import { getSocket } from '../socket/socket'
import { useWebRTC } from '../hooks/useWebRTC'
import Sidebar from '../components/sidebar/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import WelcomeScreen from '../components/chat/WelcomeScreen'
import CallScreen from '../components/call/CallScreen'
import IncomingCallModal, { setPendingOffer } from '../components/call/IncomingCallModal'
import { AnimatePresence } from 'framer-motion'

export default function ChatPage() {
  const { user } = useAuthStore()
  const {
    activeChat, fetchChats, addMessage, updateMessage,
    removeMessage, setTyping, setUserOnline, updateReactions,
    addChat, updateChatLastMessage, incrementUnread,
  } = useChatStore()
  const { receiveIncomingCall, reset: resetCall, callState } = useCallStore()
  const { handleOffer, handleAnswer, handleIceCandidate, endCall } = useWebRTC()

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

    // Real-time status from contacts
    socket.on('status:new', (status) => {
      useStatusStore.getState().addStatusFromSocket(status)
    })

    // ── Call events ──────────────────────────────────────────────
    socket.on('call:incoming', ({ from, chatId, callType, caller }) => {
      // Don't accept a second call if already in one
      const { callState } = useCallStore.getState()
      if (callState !== 'idle') return
      receiveIncomingCall({ caller, chatId, callType })
    })

    socket.on('webrtc:offer', ({ offer, from, chatId }) => {
      handleOffer(offer)
    })

    socket.on('webrtc:answer', ({ answer }) => {
      handleAnswer(answer)
    })

    socket.on('webrtc:ice-candidate', ({ candidate }) => {
      handleIceCandidate(candidate)
    })

    socket.on('call:accepted', ({ from }) => {
      // Caller is notified callee accepted — call flow continues via webrtc:answer
    })

    socket.on('call:declined', () => {
      useCallStore.getState().setCallState('idle')
      useCallStore.getState().reset()
    })

    socket.on('call:ended', () => {
      endCall()
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
      socket.off('status:new')
      socket.off('call:incoming')
      socket.off('webrtc:offer')
      socket.off('webrtc:answer')
      socket.off('webrtc:ice-candidate')
      socket.off('call:accepted')
      socket.off('call:declined')
      socket.off('call:ended')
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

      {/* Call UI — rendered above everything */}
      <AnimatePresence>
        {['outgoing', 'connecting', 'active'].includes(callState) && <CallScreen key="call-screen" />}
        {callState === 'incoming' && <IncomingCallModal key="incoming" />}
      </AnimatePresence>
    </div>
  )
}
