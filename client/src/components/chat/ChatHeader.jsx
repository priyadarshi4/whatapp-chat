import React, { useState } from 'react'
import { FiSearch, FiMoreVertical, FiArrowLeft, FiPhone, FiVideo } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useCallStore } from '../../store/callStore'
import { useWebRTC } from '../../hooks/useWebRTC'
import { getSocket } from '../../socket/socket'
import api from '../../utils/api'
import toast from 'react-hot-toast'

function getOtherParticipant(chat, userId) {
  if (!chat?.participants) return null
  return chat.participants.find(p => {
    const pId = typeof p === 'object' ? (p._id?.toString() || p.toString()) : p.toString()
    return pId !== userId?.toString()
  })
}

export default function ChatHeader() {
  const { user } = useAuthStore()
  const { activeChat, setActiveChat, typingUsers, updateChat } = useChatStore()
  const { callState, startOutgoingCall } = useCallStore()
  const { startCall } = useWebRTC()
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  if (!activeChat) return null

  const otherUser = !activeChat.isGroup ? getOtherParticipant(activeChat, user._id) : null

  const initiateCall = async (type) => {
    if (callState !== 'idle') { toast.error('Already in a call'); return }
    if (!otherUser?._id) { toast.error('Cannot call a group'); return }
    startOutgoingCall({ callee: otherUser, chatId: activeChat._id, callType: type, caller: user })
    await startCall()
  }
  const typing = typingUsers[activeChat._id] || []
  const isTyping = typing.length > 0

  const name = activeChat.isGroup ? activeChat.groupName : otherUser?.name
  const avatar = activeChat.isGroup
    ? (activeChat.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.groupName || 'G')}&background=2A3942&color=25D366`)
    : (otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || 'U')}&background=2A3942&color=25D366`)

  const statusText = activeChat.isGroup
    ? `${activeChat.participants?.length} members`
    : isTyping
      ? 'typing...'
      : otherUser?.online
        ? 'online'
        : otherUser?.lastSeen
          ? `last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`
          : 'offline'

  const handleSearch = async (q) => {
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const { data } = await api.get(`/messages/${activeChat._id}/search?q=${encodeURIComponent(q)}`)
      setSearchResults(data.messages)
    } catch {}
  }

  const deleteChat = async () => {
    try {
      await api.delete(`/chats/${activeChat._id}`)
      setActiveChat(null)
      toast.success('Chat deleted')
    } catch { toast.error('Failed to delete chat') }
    setShowMenu(false)
  }

  return (
    <div className="flex items-center px-4 py-2.5 bg-chat-header border-b border-chat-border">
      {/* Back button (mobile) */}
      <button onClick={() => setActiveChat(null)} className="icon-btn mr-2 lg:hidden">
        <FiArrowLeft size={20} />
      </button>

      {/* Avatar & info */}
      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <div className="relative">
          <img src={avatar} alt={name} className="avatar w-10 h-10" />
          {otherUser?.online && !activeChat.isGroup && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-500 rounded-full border-2 border-chat-header" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-chat-text font-semibold text-sm truncate">{name}</p>
          <p className={`text-xs truncate ${isTyping ? 'text-primary-500' : 'text-chat-textSecondary'}`}>
            {isTyping && activeChat.isGroup ? `${typing[0]?.userName} is typing...` : statusText}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Call buttons — only for 1-1 chats */}
        {!activeChat.isGroup && (
          <>
            <button
              onClick={() => initiateCall('audio')}
              disabled={callState !== 'idle'}
              title="Voice call"
              className="icon-btn disabled:opacity-40"
            >
              <FiPhone size={19} />
            </button>
            <button
              onClick={() => initiateCall('video')}
              disabled={callState !== 'idle'}
              title="Video call"
              className="icon-btn disabled:opacity-40"
            >
              <FiVideo size={19} />
            </button>
          </>
        )}

        <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); setSearchResults([]) }} className="icon-btn">
          <FiSearch size={20} />
        </button>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="icon-btn">
            <FiMoreVertical size={20} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 bg-chat-panel border border-chat-border rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden"
                onMouseLeave={() => setShowMenu(false)}
              >
                {[
                  { label: 'Search messages', action: () => { setShowSearch(true); setShowMenu(false) } },
                  { label: 'Mute notifications', action: () => setShowMenu(false) },
                  ...(activeChat.isGroup && activeChat.groupAdmin === user._id ? [
                    { label: 'Group info', action: () => setShowMenu(false) },
                  ] : []),
                  { label: 'Delete chat', action: deleteChat, className: 'text-red-400' },
                ].map(item => (
                  <button key={item.label} onClick={item.action} className={`w-full text-left px-4 py-3 text-sm hover:bg-chat-hover transition-colors ${item.className || 'text-chat-text'}`}>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search bar dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-14 left-0 right-0 bg-chat-header border-b border-chat-border px-4 py-2 z-40"
          >
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value) }}
              placeholder="Search messages..."
              className="input-field text-sm"
              onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
            />
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto">
                {searchResults.map(msg => (
                  <div key={msg._id} className="py-2 border-b border-chat-border/50 last:border-0">
                    <p className="text-xs text-chat-textSecondary">{msg.senderId?.name}</p>
                    <p className="text-chat-text text-sm truncate">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
