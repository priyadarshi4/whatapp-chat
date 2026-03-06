import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { FiCheck, FiMoreVertical, FiCornerUpLeft, FiEdit2, FiTrash2, FiStar, FiShare2 } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { getSocket } from '../../socket/socket'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍']

function MessageStatus({ message, isOwn }) {
  if (!isOwn) return null
  const hasSeen = message.seenBy?.length > 0
  const hasDelivered = message.deliveredTo?.length > 1

  return (
    <span className="inline-flex items-center ml-1">
      {hasSeen ? (
        <span className="text-blue-400 text-xs">✓✓</span>
      ) : hasDelivered ? (
        <span className="text-chat-textSecondary text-xs">✓✓</span>
      ) : (
        <span className="text-chat-textSecondary text-xs">✓</span>
      )}
    </span>
  )
}

function MediaContent({ message }) {
  if (message.messageType === 'image') {
    return (
      <img
        src={message.mediaUrl}
        alt="Image"
        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(message.mediaUrl, '_blank')}
      />
    )
  }
  if (message.messageType === 'video') {
    return (
      <video
        src={message.mediaUrl}
        controls
        className="max-w-xs rounded-lg"
        style={{ maxHeight: 300 }}
      />
    )
  }
  if (message.messageType === 'audio') {
    return (
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
          🎙️
        </div>
        <audio src={message.mediaUrl} controls className="flex-1 h-8" style={{ minWidth: 150 }} />
      </div>
    )
  }
  if (message.messageType === 'document') {
    return (
      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-black bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
        <span className="text-2xl">📄</span>
        <div>
          <p className="text-chat-text text-sm font-medium truncate max-w-[200px]">{message.mediaName || 'Document'}</p>
          <p className="text-chat-textSecondary text-xs">{message.mediaSize ? `${(message.mediaSize / 1024).toFixed(1)} KB` : ''}</p>
        </div>
      </a>
    )
  }
  return null
}

export default function MessageBubble({ message, isOwn }) {
  const { user } = useAuthStore()
  const { activeChat, updateMessage, removeMessage } = useChatStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.message)
  const menuRef = useRef()

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-chat-textSecondary text-xs bg-chat-panel px-3 py-1 rounded-full">
          {message.message}
        </span>
      </div>
    )
  }

  if (message.deletedForEveryone) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className={`${isOwn ? 'message-bubble-out' : 'message-bubble-in'} text-chat-textSecondary italic text-sm`}>
          🚫 This message was deleted
        </div>
      </div>
    )
  }

  const socket = getSocket()

  const handleReact = async (emoji) => {
    setShowReactions(false)
    socket?.emit('message:react', { messageId: message._id, emoji, chatId: activeChat._id })
  }

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.message) { setIsEditing(false); return }
    socket?.emit('message:edit', { messageId: message._id, message: editText, chatId: activeChat._id })
    updateMessage(message._id, { message: editText, isEdited: true })
    setIsEditing(false)
  }

  const handleDelete = async (forEveryone) => {
    setShowMenu(false)
    socket?.emit('message:delete', { messageId: message._id, chatId: activeChat._id, deleteForEveryone: forEveryone })
    if (forEveryone) {
      updateMessage(message._id, { deletedForEveryone: true, message: 'This message was deleted' })
    } else {
      removeMessage(message._id, false, user._id)
    }
  }

  const handleStar = async () => {
    try {
      await api.post(`/users/star-message/${message._id}`)
      toast.success('Message starred')
    } catch { toast.error('Failed to star') }
    setShowMenu(false)
  }

  const groupedReactions = message.reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = 0
    acc[r.emoji] += r.users?.length || 0
    return acc
  }, {}) || {}

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group relative`}>
      {/* Group avatar for incoming */}
      {!isOwn && activeChat?.isGroup && (
        <img
          src={message.senderId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderId?.name || 'U')}&background=2A3942&color=25D366`}
          alt={message.senderId?.name}
          className="avatar w-7 h-7 mr-2 self-end mb-1 flex-shrink-0"
        />
      )}

      <div className={`relative max-w-xs lg:max-w-md xl:max-w-lg`}>
        {/* Reply preview */}
        {message.replyTo && (
          <div className={`${isOwn ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-20'} rounded-t-lg px-3 py-2 border-l-2 border-primary-500 mb-0`}>
            <p className="text-primary-500 text-xs font-medium">{message.replyTo.senderId?.name}</p>
            <p className="text-chat-textSecondary text-xs truncate">{message.replyTo.message || '📎 Media'}</p>
          </div>
        )}

        {/* Forward indicator */}
        {message.forwardedFrom && (
          <div className="text-chat-textSecondary text-xs flex items-center gap-1 mb-1 px-1">
            <FiShare2 size={10} /> Forwarded
          </div>
        )}

        {/* Bubble */}
        <div
          className={`${isOwn ? 'message-bubble-out' : 'message-bubble-in'} ${message.replyTo ? 'rounded-tl-none rounded-tr-none rounded-bl-lg rounded-br-lg' : ''}`}
          onMouseEnter={() => {}}
        >
          {/* Group sender name */}
          {!isOwn && activeChat?.isGroup && (
            <p className="text-primary-500 text-xs font-medium mb-1">{message.senderId?.name}</p>
          )}

          {/* Media */}
          {message.mediaUrl && <div className="mb-1"><MediaContent message={message} /></div>}

          {/* Text */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="flex-1 bg-transparent outline-none border-b border-primary-500 text-chat-text text-sm"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setIsEditing(false) }}
              />
              <button onClick={handleEdit} className="text-primary-500 text-xs">✓</button>
            </div>
          ) : (
            message.message && (
              <p className="text-sm leading-relaxed break-words">
                {message.message}
                {message.isEdited && <span className="text-chat-textSecondary text-xs ml-1">(edited)</span>}
              </p>
            )
          )}

          {/* Time & status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-chat-textSecondary text-xs">
              {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
            </span>
            <MessageStatus message={message} isOwn={isOwn} />
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="flex items-center gap-0.5 bg-chat-panel rounded-full px-2 py-0.5 text-xs hover:bg-chat-hover transition-colors"
              >
                {emoji} <span className="text-chat-textSecondary">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context menu button */}
      <div className={`flex items-center ${isOwn ? 'order-first mr-1' : 'ml-1'} opacity-0 group-hover:opacity-100 transition-opacity self-center`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="icon-btn text-chat-textSecondary p-1"
        >
          <FiMoreVertical size={16} />
        </button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute ${isOwn ? 'right-8' : 'left-8'} top-0 z-50 bg-chat-panel border border-chat-border rounded-lg shadow-xl min-w-[160px] overflow-hidden`}
            ref={menuRef}
          >
            {/* Reactions */}
            <div className="flex gap-1 px-3 py-2 border-b border-chat-border">
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => handleReact(emoji)} className="text-lg hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>

            {[
              { icon: <FiCornerUpLeft size={14} />, label: 'Reply', action: () => setShowMenu(false) },
              { icon: <FiStar size={14} />, label: 'Star', action: handleStar },
              ...(isOwn && message.messageType === 'text' ? [
                { icon: <FiEdit2 size={14} />, label: 'Edit', action: () => { setIsEditing(true); setShowMenu(false) } },
              ] : []),
              ...(isOwn ? [
                { icon: <FiTrash2 size={14} />, label: 'Delete for everyone', action: () => handleDelete(true), danger: true },
              ] : []),
              { icon: <FiTrash2 size={14} />, label: 'Delete for me', action: () => handleDelete(false), danger: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-chat-hover transition-colors ${item.danger ? 'text-red-400' : 'text-chat-text'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
