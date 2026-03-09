import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import useChatStore from '../store/chatStore';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';

export default function ChatPage() {
  const { chat, loading } = useChatStore();

  if (loading) return <ChatSkeleton />;

  if (!chat) return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl mb-4">💕</motion.div>
      <h2 className="font-display text-xl text-pink-500">Waiting for your love...</h2>
      <p className="text-sm text-gray-400 mt-2">Your partner hasn't joined yet</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col flex-1 p-4 gap-3">
      <div className="skeleton h-14 rounded-2xl" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className="skeleton h-10 rounded-2xl" style={{ width: `${40 + (i * 7) % 30}%` }} />
        </div>
      ))}
    </div>
  );
}
