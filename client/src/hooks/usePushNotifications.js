import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

// Convert base64 VAPID key to Uint8Array (required for PushManager)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [swRegistration, setSwRegistration] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check browser support and register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      // Register (or get existing) service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      setSwRegistration(reg)

      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription()
      setIsSubscribed(!!existing)

      // Listen for messages from service worker (e.g. OPEN_CHAT)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OPEN_CHAT') {
          window.dispatchEvent(new CustomEvent('sw:open-chat', {
            detail: { chatId: event.data.chatId }
          }))
        }
      })

      console.log('[Push] Service worker registered:', reg.scope)
    } catch (err) {
      console.error('[Push] Service worker registration failed:', err)
    }
  }

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) return false

    setLoading(true)
    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setLoading(false)
        return false
      }

      // Get VAPID public key from server
      const { data } = await api.get('/push/vapid-public-key')
      if (!data.publicKey) {
        console.warn('[Push] No VAPID key from server')
        setLoading(false)
        return false
      }

      // Subscribe to push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      })

      // Send subscription to server
      await api.post('/push/subscribe', { subscription: subscription.toJSON() })

      setIsSubscribed(true)
      console.log('[Push] Subscribed successfully')
      setLoading(false)
      return true
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      setLoading(false)
      return false
    }
  }, [isSupported, swRegistration])

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return

    try {
      const subscription = await swRegistration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await api.post('/push/unsubscribe')
        setIsSubscribed(false)
        console.log('[Push] Unsubscribed')
      }
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
    }
  }, [swRegistration])

  // Auto-subscribe if permission already granted but not yet subscribed
  useEffect(() => {
    if (
      isSupported &&
      swRegistration &&
      permission === 'granted' &&
      !isSubscribed
    ) {
      requestPermissionAndSubscribe()
    }
  }, [isSupported, swRegistration, permission])

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    requestPermissionAndSubscribe,
    unsubscribe,
  }
}
