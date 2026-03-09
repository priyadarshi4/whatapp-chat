import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';

export default function ChatHeader() {
  const { partner, user } = useAuthStore();
  const { typingUsers, chat } = useChatStore();
  const [missYouSent, setMissYouSent] = useState(false);

  const isTyping = typingUsers.size > 0;

  const handleMissYou = async () => {
    if (missYouSent) return;
    setMissYouSent(true);
    const socket = getSocket();
    if (socket && partner?._id) {
      socket.emit('miss_you', { chatId: chat?._id, partnerId: partner._id });
    }
    // Also send as message
    const { sendMessage } = useChatStore.getState();
    await sendMessage('I miss you so much 💕', 'miss_you');
    setTimeout(() => setMissYouSent(false), 5000);
  };

  return (
    <div className="px-4 py-3 glass-card m-3 mb-0 flex items-center gap-3">
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF8FB1, #CDB4DB)' }}>
          {partner?.avatar ? (
            <img src={partner.avatar} alt={partner.username} className="w-full h-full object-cover" />
          ) : (
            <span>{partner?.username?.[0]?.toUpperCase() || '💕'}</span>
          )}
        </div>
        {partner?.isOnline && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 dark:text-pink-100 truncate">
          {partner?.username || 'My Love'} {partner?.mood ? moodEmoji(partner.mood) : ''}
        </div>
        <div className="text-xs text-gray-400">
          {isTyping ? (
            <span className="text-pink-500 flex items-center gap-1">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <motion.span key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                    className="inline-block w-1 h-1 rounded-full bg-pink-400" />
                ))}
              </span>
              typing...
            </span>
          ) : partner?.isOnline ? 'online ✨' : partner?.lastSeen ? `last seen ${formatLastSeen(partner.lastSeen)}` : ''}
        </div>
      </div>

      {/* Miss you button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleMissYou}
        disabled={missYouSent}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
          missYouSent
            ? 'bg-pink-100 text-pink-300'
            : 'text-white shadow-glow-pink'
        }`}
        style={!missYouSent ? { background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' } : {}}
      >
        <motion.span animate={missYouSent ? { scale: [1, 1.4, 1] } : {}} transition={{ repeat: Infinity, duration: 0.6 }}>
          ❤️
        </motion.span>
        {missYouSent ? 'Sent!' : 'Miss You'}
      </motion.button>
    </div>
  );
}

function moodEmoji(mood) {
  const map = { happy: '😊', missing_you: '🥺', thinking_of_you: '💭', busy: '😤', in_love: '🥰' };
  return map[mood] || '';
}

function formatLastSeen(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
