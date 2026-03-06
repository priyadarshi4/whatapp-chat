import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

// Convert base64 VAPID key to Uint8Array (required by browser API)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [error, setError] = useState(null)

  // Check if push is supported
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  // Register service worker on mount
  useEffect(() => {
    if (!isSupported) return

    registerSW()
  }, [])

  const registerSW = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      console.log('[Push] Service worker registered:', reg.scope)

      // Wait for SW to be ready
      await navigator.serviceWorker.ready
      setSwReady(true)

      // Check if already subscribed
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    } catch (err) {
      console.error('[Push] SW registration failed:', err)
      setError('Service worker registration failed')
    }
  }

  // Listen for messages from service worker (e.g. open chat on notification click)
  useEffect(() => {
    if (!isSupported) return

    const handleSWMessage = (event) => {
      if (event.data?.type === 'OPEN_CHAT' && event.data.chatId) {
        // Dispatch custom event so ChatPage can handle it
        window.dispatchEvent(new CustomEvent('sw:open-chat', { detail: { chatId: event.data.chatId } }))
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage)
  }, [])

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications not supported in this browser')
      return false
    }
    if (!swReady) {
      setError('Service worker not ready yet')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setError('Notification permission denied')
        setIsLoading(false)
        return false
      }

      // 2. Get VAPID public key from server
      const { data: keyData } = await api.get('/push/vapid-key')
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey)

      // 3. Subscribe to push
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,  // Required: must show notification for every push
        applicationServerKey,
      })

      // 4. Send subscription to server
      await api.post('/push/subscribe', { subscription: subscription.toJSON() })

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      setError(err.message || 'Failed to enable notifications')
      setIsLoading(false)
      return false
    }
  }, [swReady, isSupported])

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
      }
      await api.post('/push/unsubscribe')
      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
    }
    setIsLoading(false)
  }, [])

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      await api.post('/push/test')
      return true
    } catch (err) {
      setError(err.response?.data?.error || 'Test failed')
      return false
    }
  }, [])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    swReady,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
