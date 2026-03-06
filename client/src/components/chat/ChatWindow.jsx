import React from 'react'
import { useChatStore } from '../../store/chatStore'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatWindow() {
  const { activeChat, messages, typingUsers } = useChatStore()

  const chatId = activeChat?._id
  const chatMessages = (chatId && messages[chatId]) ? messages[chatId] : []
  const typing = (chatId && typingUsers[chatId]) ? typingUsers[chatId] : []

  return (
    <div className="flex-1 flex flex-col chat-bg-pattern">
      <ChatHeader />
      <MessageList messages={chatMessages} typing={typing} />
      <MessageInput />
    </div>
  )
}
