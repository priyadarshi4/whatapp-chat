import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiMoreVertical, FiEdit } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import ChatList from './ChatList'
import SearchPanel from './SearchPanel'
import NewChatPanel from './NewChatPanel'
import ProfilePanel from './ProfilePanel'
import NewGroupPanel from './NewGroupPanel'
import NotificationBell from '../ui/NotificationBell'
import StatusBar from '../status/StatusBar'
import StatusUploader from '../status/StatusUploader'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { searchQuery, setSearchQuery, setSidePanel, sidePanel } = useChatStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showUploader, setShowUploader] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="w-[380px] flex-shrink-0 border-r border-chat-border flex flex-col bg-chat-sidebar relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-chat-header">
        <button
          onClick={() => setSidePanel('profile')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=25D366&color=fff`}
            alt={user?.name}
            className="avatar w-10 h-10"
          />
        </button>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <button
            onClick={() => setSidePanel('new-chat')}
            className="icon-btn"
            title="New chat"
          >
            <FiEdit size={20} />
          </button>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="icon-btn">
              <FiMoreVertical size={20} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 bg-chat-panel border border-chat-border rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  {[
                    { label: 'New group', action: () => { setSidePanel('new-group'); setShowMenu(false) } },
                    { label: 'Add Status', action: () => { setShowUploader(true); setShowMenu(false) } },
                    { label: 'Profile', action: () => { setSidePanel('profile'); setShowMenu(false) } },
                    { label: 'Starred messages', action: () => { setSidePanel('starred'); setShowMenu(false) } },
                    { label: 'Log out', action: handleLogout },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full text-left px-4 py-3 text-chat-text hover:bg-chat-hover text-sm transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 bg-chat-sidebar">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSidePanel('search')}
            placeholder="Search or start new chat"
            className="w-full bg-chat-input text-chat-text placeholder-chat-textSecondary text-sm rounded-full py-2 pl-9 pr-4 outline-none"
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <ChatList />

        {/* Overlay panels */}
        <AnimatePresence>
          {sidePanel === 'search' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-0 bg-chat-sidebar z-10"
            >
              <SearchPanel onClose={() => setSidePanel(null)} />
            </motion.div>
          )}
          {sidePanel === 'new-chat' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-0 bg-chat-sidebar z-10"
            >
              <NewChatPanel onClose={() => setSidePanel(null)} />
            </motion.div>
          )}
          {sidePanel === 'new-group' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-0 bg-chat-sidebar z-10"
            >
              <NewGroupPanel onClose={() => setSidePanel(null)} />
            </motion.div>
          )}
          {sidePanel === 'profile' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-0 bg-chat-sidebar z-10"
            >
              <ProfilePanel onClose={() => setSidePanel(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Status Uploader modal */}
      <AnimatePresence>
        {showUploader && (
          <StatusUploader onClose={() => setShowUploader(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
