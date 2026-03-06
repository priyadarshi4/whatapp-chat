import React, { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import MessageBubble from './MessageBubble'

function DateDivider({ date }) {
  const d = new Date(date)
  let label = format(d, 'MMMM d, yyyy')
  if (isToday(d)) label = 'Today'
  else if (isYesterday(d)) label = 'Yesterday'

  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-chat-panel text-chat-textSecondary text-xs px-3 py-1 rounded-full shadow">
        {label}
      </span>
    </div>
  )
}

function TypingIndicator({ typing }) {
  if (typing.length === 0) return null
  return (
    <div className="flex items-end gap-2 mb-2 px-4">
      <div className="message-bubble-in flex items-center gap-1 py-3 px-4">
        <div className="typing-dot w-2 h-2 bg-chat-textSecondary rounded-full" style={{ animationDelay: '0ms' }} />
        <div className="typing-dot w-2 h-2 bg-chat-textSecondary rounded-full" style={{ animationDelay: '200ms' }} />
        <div className="typing-dot w-2 h-2 bg-chat-textSecondary rounded-full" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  )
}

export default function MessageList({ messages, typing }) {
  const { user } = useAuthStore()
  const { activeChat, loadMoreMessages, messagePagination, isLoadingMessages } = useChatStore()
  const bottomRef = useRef(null)
  const listRef = useRef(null)
  const prevScrollHeight = useRef(0)

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    if (el.scrollTop < 50 && !isLoadingMessages) {
      const chatId = activeChat?._id
      const pagination = messagePagination[chatId]
      if (pagination?.hasMore) {
        prevScrollHeight.current = el.scrollHeight
        loadMoreMessages(chatId)
      }
    }
  }, [isLoadingMessages, activeChat, messagePagination])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // Maintain scroll position after loading older messages
    if (prevScrollHeight.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeight.current
      prevScrollHeight.current = 0
    }
  }, [messages.length])

  // Group messages by date
  const messageGroups = []
  let lastDate = null
  messages.forEach((msg, idx) => {
    const msgDate = new Date(msg.createdAt)
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      messageGroups.push({ type: 'date', date: msg.createdAt, key: `date-${idx}` })
      lastDate = msgDate
    }
    messageGroups.push({ type: 'message', message: msg, key: msg._id })
  })

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
    >
      {/* Load more indicator */}
      {isLoadingMessages && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Messages */}
      {messageGroups.map(item => {
        if (item.type === 'date') {
          return <DateDivider key={item.key} date={item.date} />
        }
        const msg = item.message
        const isOwn = msg.senderId?._id === user._id || msg.senderId === user._id
        return (
          <motion.div
            key={msg._id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <MessageBubble message={msg} isOwn={isOwn} />
          </motion.div>
        )
      })}

      {/* Typing indicator */}
      <TypingIndicator typing={typing} />

      <div ref={bottomRef} />
    </div>
  )
}
