import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';

export default function ChatHeader() {
  const { user, partner } = useAuthStore();
  const { typingUsers }   = useChatStore();
  const [showMyStatus, setShowMyStatus]         = useState(false);
  const [showPartnerStatus, setShowPartnerStatus] = useState(false);

  const isTyping = typingUsers.size > 0;

  const sendMissYou = () => {
    const socket = getSocket();
    const { chat } = useChatStore.getState();
    if (socket && chat && partner) {
      socket.emit('miss_you', { chatId: chat._id, partnerId: partner._id });
      useChatStore.getState().sendMessage('I miss you so much 💕', 'miss_you');
    }
  };

  return (
    <>
      {/* ── Floating header card ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-md"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,143,177,0.25)',
            boxShadow: '0 4px 20px rgba(255,79,139,0.10)',
          }}
        >
          {/* Partner avatar — tap to see their status */}
          <button
            className="relative flex-shrink-0"
            onClick={() => partner?.statusText && setShowPartnerStatus(true)}
          >
            <div
              className={`w-10 h-10 rounded-full overflow-hidden transition-all ${partner?.statusText ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
              style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}
            >
              {partner?.avatar
                ? <img src={partner.avatar} alt={partner.username} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-lg">💕</div>}
            </div>
            {partner?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
            )}
            {/* Status ring pulse when status set */}
            {partner?.statusText && (
              <div className="absolute inset-0 rounded-full ring-2 ring-pink-400 animate-ping opacity-30" />
            )}
          </button>

          {/* Name + status text */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800 text-sm truncate">
              {partner?.username || 'Your Love'}
              {partner?.mood ? ` ${moodEmoji(partner.mood)}` : ''}
            </h2>
            <p className="text-xs truncate">
              {isTyping
                ? <span className="text-pink-400 font-medium animate-pulse">typing...</span>
                : partner?.statusText
                  ? <span className="text-gray-400 italic">"{partner.statusText}"</span>
                  : partner?.isOnline
                    ? <span className="text-green-500">online ✨</span>
                    : partner?.lastSeen
                      ? <span className="text-gray-400">last seen {formatLastSeen(partner.lastSeen)}</span>
                      : <span className="text-gray-400">offline</span>
              }
            </p>
          </div>

          {/* MY own avatar with status ring — tap to see my status */}
          <button
            className="relative flex-shrink-0"
            onClick={() => setShowMyStatus(true)}
          >
            <div
              className={`w-8 h-8 rounded-full overflow-hidden transition-all ${user?.statusText ? 'ring-2 ring-pink-500 ring-offset-1' : 'ring-1 ring-pink-200'}`}
              style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}
            >
              {user?.avatar
                ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm">🪷</div>}
            </div>
            {user?.statusText && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-pink-500 border border-white" />
            )}
          </button>

          {/* Miss You button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMissYou}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-white text-xs font-medium"
            style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)', boxShadow: '0 2px 10px rgba(255,79,139,0.35)' }}
          >
            💗 Miss You
          </motion.button>
        </div>
      </div>

      {/* Partner status popup */}
      <AnimatePresence>
        {showPartnerStatus && partner?.statusText && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowPartnerStatus(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white dark:bg-rose-dark rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-pink-400"
                style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}
              >
                {partner.avatar
                  ? <img src={partner.avatar} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">💕</div>}
              </div>
              <p className="font-semibold text-gray-800 dark:text-pink-100 text-base">{partner.username}</p>
              <p className="text-gray-500 dark:text-pink-300 mt-2 text-sm italic">"{partner.statusText}"</p>
              {partner.statusUpdatedAt && (
                <p className="text-gray-400 text-xs mt-1">{formatLastSeen(partner.statusUpdatedAt)}</p>
              )}
              <button
                onClick={() => setShowPartnerStatus(false)}
                className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}
              >
                Close 💕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MY status popup */}
      <AnimatePresence>
        {showMyStatus && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMyStatus(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white dark:bg-rose-dark rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-pink-400"
                style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}
              >
                {user?.avatar
                  ? <img src={user.avatar} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">🪷</div>}
              </div>
              <p className="font-semibold text-gray-800 dark:text-pink-100 text-base">{user?.username}</p>
              {user?.statusText
                ? <p className="text-gray-500 dark:text-pink-300 mt-2 text-sm italic">"{user.statusText}"</p>
                : <p className="text-gray-400 mt-2 text-sm">No status set</p>
              }
              <p className="text-xs text-pink-400 mt-1">— your status —</p>
              <button
                onClick={() => setShowMyStatus(false)}
                className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}
              >
                Close
              </button>
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
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
