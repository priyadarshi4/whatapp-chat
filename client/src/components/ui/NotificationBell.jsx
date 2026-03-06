import React, { useState } from 'react'
import { FiBell, FiBellOff } from 'react-icons/fi'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import toast from 'react-hot-toast'

export default function NotificationBell() {
  const { isSupported, isSubscribed, permission, loading, requestPermissionAndSubscribe, unsubscribe } = usePushNotifications()

  if (!isSupported) return null

  const handleClick = async () => {
    if (loading) return

    if (isSubscribed) {
      await unsubscribe()
      toast('Notifications disabled', { icon: '🔕' })
      return
    }

    if (permission === 'denied') {
      toast.error('Notifications are blocked. Go to browser Site Settings → Notifications → Allow.')
      return
    }

    const success = await requestPermissionAndSubscribe()
    if (success) {
      toast.success('Notifications enabled! 🔔')
    } else if (Notification.permission === 'denied') {
      toast.error('Permission denied. Allow notifications in browser settings.')
    } else {
      toast.error('Could not enable notifications — check VAPID keys in server/.env')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={
        permission === 'denied'  ? 'Notifications blocked — click for instructions' :
        isSubscribed             ? 'Notifications ON — click to disable' :
                                   'Click to enable push notifications'
      }
      className={`icon-btn relative transition-colors ${
        isSubscribed ? 'text-primary-500' : 'text-chat-textSecondary'
      }`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <FiBell size={20} />
      ) : (
        <FiBellOff size={20} />
      )}

      {/* Green active dot */}
      {isSubscribed && !loading && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full border border-chat-header" />
      )}
    </button>
  )
}
