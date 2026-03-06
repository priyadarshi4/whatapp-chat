import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiBellOff, FiCheck, FiX, FiLoader } from 'react-icons/fi'
import { useNotifications } from '../../hooks/useNotifications'
import toast from 'react-hot-toast'

export default function NotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = useNotifications()

  const [showPopup, setShowPopup] = useState(false)
  const [testSent, setTestSent] = useState(false)

  if (!isSupported) return null

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
      toast.success('Push notifications disabled')
    } else {
      const ok = await subscribe()
      if (ok) {
        toast.success('Push notifications enabled! 🔔')
        setShowPopup(true)
        setTimeout(() => setShowPopup(false), 5000)
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Enable in browser settings.')
      } else {
        toast.error(error || 'Could not enable notifications')
      }
    }
  }

  const handleTest = async () => {
    const ok = await sendTestNotification()
    if (ok) {
      setTestSent(true)
      toast.success('Test notification sent!')
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        title={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
        className={`icon-btn relative ${isSubscribed ? 'text-primary-500' : 'text-chat-textSecondary'}`}
      >
        {isLoading ? (
          <FiLoader size={20} className="animate-spin" />
        ) : isSubscribed ? (
          <FiBell size={20} />
        ) : (
          <FiBellOff size={20} />
        )}

        {/* Green dot when active */}
        {isSubscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full border border-chat-header" />
        )}
      </button>

      {/* Success popup with test button */}
      <AnimatePresence>
        {showPopup && isSubscribed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-12 right-0 bg-chat-panel border border-chat-border rounded-xl shadow-2xl p-4 w-64 z-50"
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 icon-btn p-1"
            >
              <FiX size={14} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-500 bg-opacity-20 rounded-full flex items-center justify-center">
                <FiBell className="text-primary-500" size={20} />
              </div>
              <div>
                <p className="text-chat-text text-sm font-semibold">Notifications On!</p>
                <p className="text-chat-textSecondary text-xs">You'll get alerts when offline</p>
              </div>
            </div>

            <button
              onClick={handleTest}
              disabled={testSent}
              className="w-full text-center text-xs bg-chat-input hover:bg-chat-hover text-chat-text py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {testSent ? (
                <><FiCheck size={12} className="text-primary-500" /> Sent!</>
              ) : (
                'Send test notification'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
