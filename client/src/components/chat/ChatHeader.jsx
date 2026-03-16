import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';

export default function ChatHeader() {
  const { user, partner } = useAuthStore();
  const { typingUsers }   = useChatStore();
  const [showMyStatus, setShowMyStatus]           = useState(false);
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
      {/*
        NO wrapper div with padding / margin.
        The header sits flush at the top of the chat, styled to look good
        in both light and dark mode using Tailwind dark: classes.
      */}
      <div className="
        flex items-center gap-3 px-4 py-3 flex-shrink-0
        bg-white dark:bg-[#2d1525]
        border-b border-pink-100 dark:border-pink-900/40
        shadow-sm dark:shadow-none
      ">
        {/* Partner avatar — tap when they have a status */}
        <button
          className="relative flex-shrink-0"
          onClick={() => partner?.statusText && setShowPartnerStatus(true)}
        >
          <div
            className={`w-11 h-11 rounded-full overflow-hidden transition-all
              ${partner?.statusText
                ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-white dark:ring-offset-[#2d1525]'
                : ''
              }`}
            style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}
          >
            {partner?.avatar
              ? <img src={partner.avatar} alt={partner.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-lg">💕</div>}
          </div>

          {/* Online dot */}
          {partner?.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-[#2d1525]" />
          )}

          {/* Pulse ring when partner has status */}
          {partner?.statusText && (
            <span className="absolute inset-0 rounded-full ring-2 ring-pink-400 animate-ping opacity-25 pointer-events-none" />
          )}
        </button>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-gray-800 dark:text-pink-100 truncate">
            {partner?.username || 'Your Love'}
            {partner?.mood ? ` ${moodEmoji(partner.mood)}` : ''}
          </h2>
          <p className="text-xs truncate">
            {isTyping
              ? <span className="text-pink-400 font-medium animate-pulse">typing...</span>
              : partner?.statusText
                ? <span className="text-gray-400 dark:text-pink-300/70 italic">"{partner.statusText}"</span>
                : partner?.isOnline
                  ? <span className="text-green-500">online ✨</span>
                  : partner?.lastSeen
                    ? <span className="text-gray-400 dark:text-pink-300/50">last seen {ago(partner.lastSeen)}</span>
                    : <span className="text-gray-400 dark:text-pink-300/50">offline</span>
            }
          </p>
        </div>

        {/* MY avatar — tap to see own status */}
        <button className="relative flex-shrink-0" onClick={() => setShowMyStatus(true)}>
          <div
            className={`w-8 h-8 rounded-full overflow-hidden
              ${user?.statusText
                ? 'ring-2 ring-pink-500 ring-offset-1 ring-offset-white dark:ring-offset-[#2d1525]'
                : 'ring-1 ring-pink-200 dark:ring-pink-800'
              }`}
            style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}
          >
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-sm">🪷</div>}
          </div>
          {user?.statusText && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-pink-500 border border-white dark:border-[#2d1525]" />
          )}
        </button>

        {/* Miss You */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendMissYou}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-white text-xs font-medium"
          style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)', boxShadow: '0 2px 10px rgba(255,79,139,0.35)' }}
        >
          💗 Miss You
        </motion.button>
      </div>

      {/* ── Partner status popup ── */}
      <AnimatePresence>
        {showPartnerStatus && partner?.statusText && (
          <StatusPopup
            avatar={partner.avatar}
            name={partner.username}
            status={partner.statusText}
            updatedAt={partner.statusUpdatedAt}
            onClose={() => setShowPartnerStatus(false)}
            gradientFrom="#FF8FB1"
            gradientTo="#CDB4DB"
          />
        )}
      </AnimatePresence>

      {/* ── My status popup ── */}
      <AnimatePresence>
        {showMyStatus && (
          <StatusPopup
            avatar={user?.avatar}
            name={user?.username}
            status={user?.statusText}
            updatedAt={user?.statusUpdatedAt}
            onClose={() => setShowMyStatus(false)}
            gradientFrom="#FF4F8B"
            gradientTo="#CDB4DB"
            isSelf
          />
        )}
      </AnimatePresence>
    </>
  );
}

function StatusPopup({ avatar, name, status, updatedAt, onClose, gradientFrom, gradientTo, isSelf }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        className="bg-white dark:bg-[#3d1f33] rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-pink-400"
          style={{ background: `linear-gradient(135deg,${gradientFrom},${gradientTo})` }}
        >
          {avatar
            ? <img src={avatar} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">{isSelf ? '🪷' : '💕'}</div>}
        </div>
        <p className="font-semibold text-gray-800 dark:text-pink-100 text-base">{name}</p>
        {status
          ? <p className="text-gray-500 dark:text-pink-300 mt-2 text-sm italic">"{status}"</p>
          : <p className="text-gray-400 mt-2 text-sm">No status set</p>}
        {updatedAt && <p className="text-gray-400 text-xs mt-1">{ago(updatedAt)}</p>}
        {isSelf && <p className="text-pink-400 text-xs mt-1">— your status —</p>}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

function moodEmoji(mood) {
  return { happy:'😊', missing_you:'🥺', thinking_of_you:'💭', busy:'😅', in_love:'🥰' }[mood] || '';
}

function ago(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}
