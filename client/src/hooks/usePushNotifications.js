import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePushNotifications() {
  const [permission, setPermission]       = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const [isSubscribed, setIsSubscribed]   = useState(false)
  const [isSupported]                     = useState(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)
  const [swRegistration, setSwRegistration] = useState(null)
  const [loading, setLoading]             = useState(false)

  useEffect(() => {
    if (!isSupported) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        await navigator.serviceWorker.ready
        setSwRegistration(reg)

        // Check existing subscription
        const existing = await reg.pushManager.getSubscription()
        setIsSubscribed(!!existing)

        // Listen for SW messages (notification click → open chat)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'OPEN_CHAT') {
            window.dispatchEvent(new CustomEvent('sw:open-chat', { detail: { chatId: event.data.chatId } }))
          }
        })
      })
      .catch(err => console.error('[Push] SW registration failed:', err))
  }, [isSupported])

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) return false

    setLoading(true)
    try {
      // 1. Ask for permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setLoading(false); return false }

      // 2. Get VAPID key from server  ← FIXED: was '/push/vapid-public-key'
      let publicKey
      try {
        const { data } = await api.get('/push/vapid-key')
        publicKey = data.publicKey
      } catch (err) {
        console.error('[Push] Could not get VAPID key:', err.response?.data || err.message)
        setLoading(false)
        return false
      }

      if (!publicKey) {
        console.warn('[Push] Server returned no VAPID key — add keys to server/.env')
        setLoading(false)
        return false
      }

      // 3. Subscribe in browser
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // 4. Save on server
      await api.post('/push/subscribe', { subscription: subscription.toJSON() })

      setIsSubscribed(true)
      setLoading(false)
      return true
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      setLoading(false)
      return false
    }
  }, [isSupported, swRegistration])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      if (swRegistration) {
        const sub = await swRegistration.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await api.post('/push/unsubscribe')
      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
    }
    setLoading(false)
  }, [swRegistration])

  return { isSupported, isSubscribed, permission, loading, requestPermissionAndSubscribe, unsubscribe }
}
