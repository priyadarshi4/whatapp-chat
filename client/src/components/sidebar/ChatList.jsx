import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { FiStar } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import api from '../../utils/api'
import { getSocket } from '../../socket/socket'

function getOtherParticipant(chat, userId) {
  return chat.participants?.find(p => p._id !== userId)
}

function getChatName(chat, userId) {
  if (chat.isGroup) return chat.groupName
  return getOtherParticipant(chat, userId)?.name || 'Unknown'
}

function getChatAvatar(chat, userId) {
  if (chat.isGroup) {
    return (
      chat.groupAvatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        chat.groupName || 'G'
      )}&background=2A3942&color=25D366`
    )
  }

  const other = getOtherParticipant(chat, userId)

  return (
    other?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      other?.name || 'U'
    )}&background=2A3942&color=25D366`
  )
}

function getLastMessageText(chat, userId) {
  const msg = chat.lastMessage
  if (!msg) return ''

  if (msg.deletedForEveryone) return '🚫 This message was deleted'

  const isMe = msg.senderId?._id === userId || msg.senderId === userId
  const prefix = isMe ? 'You: ' : ''

  switch (msg.messageType) {
    case 'image':
      return `${prefix}📷 Photo`
    case 'video':
      return `${prefix}🎥 Video`
    case 'audio':
      return `${prefix}🎙️ Voice note`
    case 'document':
      return `${prefix}📄 Document`
    case 'system':
      return msg.message
    default:
      return `${prefix}${msg.message}`
  }
}

export default function ChatList() {
  const { user } = useAuthStore()

  const {
    chats,
    activeChat,
    setActiveChat,
    fetchMessages,
    unreadCounts,
    typingUsers,
    isLoadingChats
  } = useChatStore()

  const { pinnedChats = [] } = user || {}

  const sortedChats = useMemo(() => {
    const pinned = chats.filter(c => pinnedChats.includes(c._id))
    const unpinned = chats.filter(c => !pinnedChats.includes(c._id))
    return [...pinned, ...unpinned]
  }, [chats, pinnedChats])

  const handleChatClick = async (chat) => {
    if (activeChat?._id === chat._id) return

    setActiveChat(chat)

    const socket = getSocket()

    if (socket) {
      if (activeChat) socket.emit('chat:leave', activeChat._id)
      socket.emit('chat:join', chat._id)
    }

    await fetchMessages(chat._id, 1)

    try {
      await api.post(`/messages/${chat._id}/seen`)
      if (socket) socket.emit('message:seen', { chatId: chat._id })
    } catch {}
  }

  if (isLoadingChats) {
    return (
      <div className="flex-1 overflow-y-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-12 rounded-full bg-chat-input animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-chat-input rounded animate-pulse w-3/4" />
              <div className="h-3 bg-chat-input rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-chat-textSecondary text-sm">No chats yet</p>
          <p className="text-chat-textSecondary text-xs mt-1">
            Search for users to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedChats.map((chat, idx) => {
        const isActive = activeChat?._id === chat._id
        const isPinned = pinnedChats.includes(chat._id)
        const unread = unreadCounts[chat._id] || 0
        const typing = typingUsers[chat._id] || []

        const otherUser = !chat.isGroup
          ? getOtherParticipant(chat, user._id)
          : null

        const isOnline = otherUser?.online

        return (
          <motion.div
            key={chat._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.2 }}
            onClick={() => handleChatClick(chat)}
            className={`chat-item border-b border-chat-border/30 ${
              isActive ? 'bg-chat-active' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={getChatAvatar(chat, user._id)}
                alt={getChatName(chat, user._id)}
                className="avatar w-12 h-12"
              />

              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary-500 rounded-full border-2 border-chat-sidebar" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-chat-text text-sm truncate flex items-center gap-1">
                  {isPinned && (
                    <FiStar
                      size={12}
                      className="text-chat-textSecondary flex-shrink-0"
                    />
                  )}

                  {getChatName(chat, user._id)}
                </span>

                <span className="text-xs text-chat-textSecondary flex-shrink-0 ml-2">
                  {chat.lastMessage?.createdAt
                    ? formatDistanceToNow(
                        new Date(chat.lastMessage.createdAt),
                        { addSuffix: false }
                      )
                        .replace('about ', '')
                        .replace(' minutes', 'm')
                        .replace(' minute', 'm')
                        .replace(' hours', 'h')
                        .replace(' hour', 'h')
                        .replace(' days', 'd')
                        .replace(' day', 'd')
                    : ''}
                </span>
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-chat-textSecondary truncate max-w-[200px]">
                  {typing.length > 0 ? (
                    <span className="text-primary-500">
                      {chat.isGroup
                        ? `${typing[0].userName} is typing...`
                        : 'typing...'}
                    </span>
                  ) : (
                    getLastMessageText(chat, user._id)
                  )}
                </span>

                {unread > 0 && (
                  <span className="ml-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-medium">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}