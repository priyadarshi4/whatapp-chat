import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';

const tabs = [
  { path: '/',        icon: '💬', label: 'Chat'    },
  { path: '/room',    icon: '🌸', label: 'Moments' },
  { path: '/games',   icon: '🎮', label: 'Games'   },
  { path: '/draw',    icon: '🎨', label: 'Draw'    },
  { path: '/love',    icon: '❤️', label: 'Love'    },
  { path: '/letters', icon: '💌', label: 'Letters' },
  { path: '/profile', icon: '🪷', label: 'Me'      },
];

export default function BottomNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { unreadCount } = useChatStore();
  const { user }  = useAuthStore();
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  return (
    <>
      <nav
        className="bottom-nav"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/room' && ['/room', '/moments'].includes(location.pathname));

          const isProfile = tab.path === '/profile';

          const handleClick = (e) => {
            if (isProfile) {
              // Always navigate to /profile — status popup is only on the chat header
              navigate('/profile');
              return;
            }
            // default NavLink behaviour handles it
          };

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={isProfile ? (e) => { e.preventDefault(); navigate('/profile'); } : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0 px-2 py-2 relative min-h-[52px] min-w-[48px]"
            >
              <div className="relative">
                {/* Profile tab: show avatar if available */}
                {isProfile && user?.avatar ? (
                  <div className={`w-7 h-7 rounded-full overflow-hidden ${user?.statusText ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}>
                    <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                ) : (
                  <motion.span
                    animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                    className="text-xl block"
                  >
                    {tab.icon}
                  </motion.span>
                )}

                {/* Unread badge on Chat tab */}
                {tab.path === '/' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-pink-500' : 'text-gray-400'}`}>
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-500"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
