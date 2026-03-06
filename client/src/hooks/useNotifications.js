import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export function useNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [swRegistration, setSwRegistration] = useState(null)
  const [error, setError] = useState(null)
  const supported = isSupported()

  // Register SW and check subscription state on mount
  useEffect(() => {
    if (!supported) return

    const setup = async () => {
      try {
        // Register the service worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[Notif] SW registered, scope:', reg.scope)

        // Wait until the SW is actually active
        if (reg.installing) {
          await new Promise(resolve => {
            reg.installing.addEventListener('statechange', function() {
              if (this.state === 'activated') resolve()
            })
          })
        }

        await navigator.serviceWorker.ready
        setSwRegistration(reg)

        // Check if browser already has an active subscription
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          console.log('[Notif] Existing subscription found')
          setIsSubscribed(true)
        } else {
          console.log('[Notif] No existing subscription')
          setIsSubscribed(false)
        }
      } catch (err) {
        console.error('[Notif] SW setup error:', err)
        setError('Service worker setup failed: ' + err.message)
      }
    }

    setup()

    // Listen for messages from SW (notification click → open chat)
    const onMessage = (event) => {
      if (event.data?.type === 'OPEN_CHAT' && event.data.chatId) {
        window.dispatchEvent(new CustomEvent('sw:open-chat', { detail: { chatId: event.data.chatId } }))
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) { setError('Not supported in this browser'); return false }
    if (!swRegistration) { setError('Service worker not ready'); return false }

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Ask for permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Permission denied. Check browser notification settings.')
        setIsLoading(false)
        return false
      }

      // Step 2: Get VAPID public key from OUR server
      let vapidKey
      try {
        const { data } = await api.get('/push/vapid-key')
        vapidKey = data.publicKey
      } catch (err) {
        const msg = err.response?.status === 503
          ? 'Server push not configured (missing VAPID keys in .env)'
          : 'Could not fetch push config from server'
        setError(msg)
        setIsLoading(false)
        return false
      }

      // Step 3: Create browser push subscription
      const reg = await navigator.serviceWorker.ready
      let subscription
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      } catch (err) {
        setError('Push subscription failed: ' + err.message)
        setIsLoading(false)
        return false
      }

      // Step 4: Send subscription to our backend
      await api.post('/push/subscribe', { subscription: subscription.toJSON() })
      console.log('[Notif] Subscribed successfully!')
      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[Notif] Subscribe error:', err)
      setError(err.message || 'Unknown error')
      setIsLoading(false)
      return false
    }
  }, [supported, swRegistration])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      if (swRegistration) {
        const sub = await swRegistration.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await api.post('/push/unsubscribe')
      setIsSubscribed(false)
      console.log('[Notif] Unsubscribed')
    } catch (err) {
      console.error('[Notif] Unsubscribe error:', err)
    }
    setIsLoading(false)
  }, [swRegistration])

  const sendTest = useCallback(async () => {
    try {
      await api.post('/push/test')
      return true
    } catch (err) {
      setError(err.response?.data?.error || 'Test notification failed')
      return false
    }
  }, [])

  return { supported, isSubscribed, isLoading, permission, error, subscribe, unsubscribe, sendTest }
}
