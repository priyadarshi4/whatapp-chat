import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiBellOff, FiCheck } from 'react-icons/fi'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import toast from 'react-hot-toast'

export default function NotificationBell() {
  const { isSupported, isSubscribed, permission, loading, requestPermissionAndSubscribe, unsubscribe } = usePushNotifications()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!isSupported) return null

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe()
      toast('Push notifications disabled', { icon: '🔕' })
    } else {
      const success = await requestPermissionAndSubscribe()
      if (success) {
        toast.success('Push notifications enabled! You\'ll be notified of new messages.')
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Please allow them in your browser settings.')
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={loading}
        className={`icon-btn relative ${isSubscribed ? 'text-primary-500' : 'text-chat-textSecondary'}`}
        title={isSubscribed ? 'Notifications ON - click to disable' : 'Enable push notifications'}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        ) : isSubscribed ? (
          <FiBell size={20} />
        ) : (
          <FiBellOff size={20} />
        )}

        {/* Green dot when active */}
        {isSubscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
        )}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-chat-panel border border-chat-border text-chat-text text-xs px-2 py-1 rounded shadow-lg z-50 pointer-events-none"
          >
            {isSubscribed ? 'Notifications ON' : 'Enable notifications'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
