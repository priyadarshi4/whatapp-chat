import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';

const tabs = [
  { path: '/', icon: '💬', label: 'Chat' },
  { path: '/room', icon: '🌸', label: 'Moments' },
  { path: '/love', icon: '❤️', label: 'Love' },
  { path: '/letters', icon: '💌', label: 'Letters' },
  { path: '/profile', icon: '🪷', label: 'Me' },
];

export default function BottomNav() {
  const location = useLocation();
  const { unreadCount } = useChatStore();
  const { user } = useAuthStore();
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  return (
    <>
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/room' && ['/room','/moments','/games','/draw'].includes(location.pathname));

          const isProfile = tab.path === '/profile';
          const hasStatus = isProfile && !!user?.statusText;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={hasStatus ? (e) => { e.preventDefault(); setShowStatusPopup(true); } : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative min-h-[52px]"
            >
              <div className="relative">
                {isProfile && user?.avatar ? (
                  <div
                    className={`w-7 h-7 rounded-full overflow-hidden transition-all ${hasStatus ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
                    onClick={hasStatus ? (e) => { e.preventDefault(); e.stopPropagation(); setShowStatusPopup(true); } : undefined}
                  >
                    <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                ) : (
                  <motion.span animate={isActive ? { scale: 1.2 } : { scale: 1 }} className="text-xl block">
                    {tab.icon}
                  </motion.span>
                )}
                {tab.path === '/' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-pink-500' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div layoutId="nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status popup when tapping profile avatar */}
      <AnimatePresence>
        {showStatusPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setShowStatusPopup(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white dark:bg-rose-dark rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-pink-400"
                style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}>
                {user?.avatar
                  ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">🪷</div>}
              </div>
              <p className="font-semibold text-gray-800 dark:text-pink-100 text-lg">{user?.username}</p>
              <p className="text-gray-500 dark:text-pink-300 mt-2 text-sm italic">"{user?.statusText}"</p>
              {user?.statusUpdatedAt && (
                <p className="text-gray-400 text-xs mt-1">{formatTime(user.statusUpdatedAt)}</p>
              )}
              <div className="flex gap-2 mt-4">
                <NavLink to="/profile" onClick={() => setShowStatusPopup(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-pink-500 border border-pink-200">
                  Edit Status
                </NavLink>
                <button onClick={() => setShowStatusPopup(false)}
                  className="flex-1 py-2 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
