import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';

export default function ChatHeader() {
  const { user, partner } = useAuthStore();
  const { typingUsers } = useChatStore();
  const [showStatus, setShowStatus] = useState(false);

  const isTyping = typingUsers.size > 0;

  const sendMissYou = () => {
    const socket = getSocket();
    const { chat } = useChatStore.getState();
    if (socket && chat && partner) {
      socket.emit('miss_you', { chatId: chat._id, partnerId: partner._id });
      // Also send as message
      useChatStore.getState().sendMessage('I miss you so much 💕', 'miss_you');
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-rose-dark border-b border-pink-100 dark:border-pink-900/30 flex-shrink-0 shadow-sm">
        {/* Avatar with status ring */}
        <button onClick={() => partner?.statusText && setShowStatus(true)} className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full overflow-hidden ${partner?.statusText ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
            style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}>
            {partner?.avatar
              ? <img src={partner.avatar} alt={partner.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-lg">💕</div>}
          </div>
          {/* Online dot */}
          {partner?.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
          )}
        </button>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-800 dark:text-pink-100 text-sm truncate">
            {partner?.username || 'Your Love'}
            {partner?.mood ? ` ${moodEmoji(partner.mood)}` : ''}
          </h2>
          <p className="text-xs truncate">
            {isTyping ? (
              <span className="text-pink-400 font-medium animate-pulse">typing...</span>
            ) : partner?.statusText ? (
              <span className="text-gray-400">"{partner.statusText}"</span>
            ) : partner?.isOnline ? (
              <span className="text-green-500">online ✨</span>
            ) : partner?.lastSeen ? (
              <span className="text-gray-400">last seen {formatLastSeen(partner.lastSeen)}</span>
            ) : (
              <span className="text-gray-400">offline</span>
            )}
          </p>
        </div>

        {/* Miss You button */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={sendMissYou}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-white text-xs font-medium shadow-glow-pink"
          style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
          💗 Miss You
        </motion.button>
      </div>

      {/* Partner status popup */}
      <AnimatePresence>
        {showStatus && partner?.statusText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowStatus(false)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="bg-white dark:bg-rose-dark rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-pink-400"
                style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}>
                {partner.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">💕</div>}
              </div>
              <p className="font-semibold text-gray-800 dark:text-pink-100">{partner.username}</p>
              <p className="text-gray-500 dark:text-pink-300 mt-2 text-sm italic">"{partner.statusText}"</p>
              {partner.statusUpdatedAt && (
                <p className="text-gray-400 text-xs mt-1">{formatLastSeen(partner.statusUpdatedAt)}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function moodEmoji(mood) {
  const map = { happy: '😊', missing_you: '🥺', thinking_of_you: '💭', busy: '😅', in_love: '🥰' };
  return map[mood] || '';
}

function formatLastSeen(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
