import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import useChatStore from '../../store/chatStore';

const tabs = [
  { path: '/', icon: '💬', label: 'Chat' },
  { path: '/moments', icon: '🌸', label: 'Moments' },
  { path: '/love', icon: '❤️', label: 'Love' },
  { path: '/letters', icon: '💌', label: 'Letters' },
  { path: '/profile', icon: '🪷', label: 'Me' },
];

export default function BottomNav() {
  const location = useLocation();
  const { unreadCount } = useChatStore();

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <NavLink key={tab.path} to={tab.path}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative min-h-[48px]">
            <div className="relative">
              <motion.span
                animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                className="text-xl block"
              >
                {tab.icon}
              </motion.span>
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
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-500"
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
