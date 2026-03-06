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
import IncomingCallModal from '../components/call/IncomingCallModal'
import { AnimatePresence } from 'framer-motion'

export default function ChatPage() {
  const { user } = useAuthStore()
  const {
    activeChat, fetchChats, addMessage, updateMessage,
    removeMessage, setTyping, setUserOnline, updateReactions,
    addChat, updateChatLastMessage, incrementUnread,
  } = useChatStore()
  const { callState } = useCallStore()
  const { handleAnswer, handleIceCandidate, endCall } = useWebRTC()

  const notificationSound = useRef(null)

  useEffect(() => {
    fetchChats()

    const handleOpenChat = async (event) => {
      const { chatId } = event.detail
      if (!chatId) return
      const { chats, fetchChats: refetch, setActiveChat, fetchMessages } = useChatStore.getState()
      let chat = chats.find(c => c._id === chatId)
      if (!chat) {
        await refetch()
        chat = useChatStore.getState().chats.find(c => c._id === chatId)
      }
      if (chat) {
        setActiveChat(chat)
        fetchMessages(chatId, 1)
        getSocket()?.emit('chat:join', chatId)
      }
    }
    window.addEventListener('sw:open-chat', handleOpenChat)
    return () => window.removeEventListener('sw:open-chat', handleOpenChat)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('message:received', ({ message, tempId, chatId }) => {
      const normalizedChatId = typeof chatId === 'object' ? chatId.toString() : chatId
      const normalizedMessage = { ...message, chatId: normalizedChatId, tempId }
      const { messages } = useChatStore.getState()
      if (tempId && message.senderId?._id === user._id) {
        useChatStore.setState(state => {
          const chatMessages = state.messages[normalizedChatId] || []
          const filtered = chatMessages.filter(m => m._id !== tempId)
          if (filtered.find(m => m._id === message._id)) return {}
          return { messages: { ...state.messages, [normalizedChatId]: [...filtered, normalizedMessage] } }
        })
        useChatStore.getState().updateChatLastMessage(normalizedChatId, normalizedMessage)
        return
      }
      addMessage(normalizedMessage)
      if (message.senderId?._id !== user._id) {
        const { activeChat } = useChatStore.getState()
        if (!activeChat || activeChat._id !== normalizedChatId) {
          incrementUnread(normalizedChatId)
          try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
          if (Notification.permission === 'granted') {
            new Notification(message.senderId?.name || 'New message', {
              body: message.messageType === 'text' ? message.message : `Sent a ${message.messageType}`,
              icon: message.senderId?.avatar || '/chat-icon.svg',
            })
          }
        }
      }
    })

    socket.on('message:edited',    ({ messageId, message }) => updateMessage(messageId, { message, isEdited: true }))
    socket.on('message:deleted',   ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) updateMessage(messageId, { deletedForEveryone: true, message: 'This message was deleted', mediaUrl: '' })
      else removeMessage(messageId, false, user._id)
    })
    socket.on('message:reacted',   ({ messageId, reactions }) => updateReactions(messageId, reactions))
    socket.on('message:seen',      ({ chatId, seenBy }) => {
      const chatMessages = useChatStore.getState().messages[chatId] || []
      chatMessages.forEach(msg => {
        if (msg.senderId._id === user._id && !msg.seenBy?.find(s => s.user === seenBy))
          updateMessage(msg._id, { seenBy: [...(msg.seenBy || []), { user: seenBy, seenAt: new Date() }] })
      })
    })
    socket.on('message:delivered', ({ messageId }) => updateMessage(messageId, { delivered: true }))
    socket.on('typing:update',     ({ chatId, userId, userName, isTyping }) => {
      if (userId !== user._id) setTyping(chatId, userId, userName, isTyping)
    })
    socket.on('user:online',       ({ userId }) => { if (userId !== user._id) setUserOnline(userId, true) })
    socket.on('user:offline',      ({ userId, lastSeen }) => { if (userId !== user._id) setUserOnline(userId, false, lastSeen) })
    socket.on('chat:created',      (chat) => addChat(chat))
    socket.on('status:new',        (status) => useStatusStore.getState().addStatusFromSocket(status))

    // ── Call signaling ─────────────────────────────────────────────────────
    socket.on('call:incoming', ({ from, chatId, callType, caller, offer }) => {
      if (useCallStore.getState().callState !== 'idle') return
      // Store offer AND set incoming state atomically in one setState call
      useCallStore.setState({
        callState: 'incoming',
        caller,
        chatId,
        callType,
        pendingOffer: offer,   // offer arrives with the ring — no race condition
        error: null,
      })
    })

    // Caller receives answer → set remote description
    socket.on('webrtc:answer', ({ answer }) => {
      handleAnswer(answer)
    })

    socket.on('webrtc:ice-candidate', ({ candidate }) => {
      handleIceCandidate(candidate)
    })

    socket.on('call:declined', () => {
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
      socket.off('webrtc:answer')
      socket.off('webrtc:ice-candidate')
      socket.off('call:declined')
      socket.off('call:ended')
    }
  }, [user])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-chat-bg">
      <Sidebar />
      <div className="flex-1 flex">
        {activeChat ? <ChatWindow /> : <WelcomeScreen />}
      </div>
      <AnimatePresence>
        {['outgoing', 'connecting', 'active'].includes(callState) && <CallScreen key="call-screen" />}
        {callState === 'incoming' && <IncomingCallModal key="incoming" />}
      </AnimatePresence>
    </div>
  )
}
