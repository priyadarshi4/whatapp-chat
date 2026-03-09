import React, { useEffect, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';

const MessageList = memo(() => {
  const { messages, loadingMore, hasMore, loadMore, markRead } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const msgRefs = useRef({}); // messageId -> DOM ref

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const isMine = last?.senderId?._id === user?._id || last?.senderId === user?._id;
    const el = containerRef.current;
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isMine || nearBottom) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
  }, [messages.length]);

  // Mark read on mount and new messages
  useEffect(() => {
    markRead();
  }, [messages.length]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop < 80) {
      prevScrollHeight.current = el.scrollHeight;
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

  // Restore scroll after loading older messages
  useEffect(() => {
    const el = containerRef.current;
    if (el && prevScrollHeight.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [messages]);

  // FEATURE 1: Scroll to original message when reply preview is tapped
  const handleScrollToMessage = useCallback((messageId) => {
    const el = msgRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.style.transition = 'background 0.3s';
      el.style.background = 'rgba(255,79,139,0.15)';
      el.style.borderRadius = '12px';
      setTimeout(() => { el.style.background = ''; }, 1200);
    }
  }, []);

  const grouped = groupByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto chat-scroll px-2 py-2 flex flex-col"
      style={{ overscrollBehavior: 'contain' }}
    >
      {loadingMore && (
        <div className="flex justify-center py-3">
          <span className="text-pink-400 text-xs animate-pulse">Loading earlier messages...</span>
        </div>
      )}

      {grouped.map(({ date, msgs }) => (
        <div key={date}>
          <DateDivider date={date} />
          {msgs.map((msg) => (
            <div
              key={msg._id || msg.tempId}
              ref={el => { if (el && msg._id) msgRefs.current[msg._id] = el; }}
            >
              <MessageBubble
                message={msg}
                isMine={msg.senderId?._id === user?._id || msg.senderId === user?._id}
                showAvatar={true}
                onScrollToMessage={handleScrollToMessage}
              />
            </div>
          ))}
        </div>
      ))}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
});

const DateDivider = memo(({ date }) => (
  <div className="flex items-center gap-2 my-3">
    <div className="flex-1 h-px bg-pink-100 dark:bg-pink-900/30" />
    <span className="text-[10px] text-pink-300 px-2 font-medium whitespace-nowrap">{date}</span>
    <div className="flex-1 h-px bg-pink-100 dark:bg-pink-900/30" />
  </div>
));

function groupByDate(messages) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  messages.forEach((msg) => {
    const d = formatDate(new Date(msg.createdAt));
    if (d !== currentDate) {
      currentDate = d;
      currentGroup = { date: d, msgs: [] };
      groups.push(currentGroup);
    }
    currentGroup.msgs.push(msg);
  });
  return groups;
}

function formatDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return 'Today';
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default MessageList;
