// Service Worker for ChatApp Push Notifications
// Placed in /public/sw.js so it's served at root scope

const CACHE_NAME = 'chatapp-v1';

// Install: cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push Event ──────────────────────────────────────────────────────────────
// Fired when server sends a push notification (user is offline or tab not focused)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ChatApp', body: event.data.text() };
  }

  const title = data.title || 'ChatApp';
  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/chat-icon.svg',
    badge: data.badge || '/badge-icon.png',
    tag: data.tag || 'chatapp-notification',
    renotify: data.renotify !== false,
    vibrate: [200, 100, 200],
    silent: false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    // Show timestamp
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    // Find an already-open tab of the app and focus it, or open a new one
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to find existing open tab
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          // Tell the app which chat to open
          if (notifData.chatId) {
            client.postMessage({ type: 'OPEN_CHAT', chatId: notifData.chatId });
          }
          return;
        }
      }
      // No open tab — open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Notification Close ───────────────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Analytics or cleanup could go here
  console.log('[SW] Notification dismissed:', event.notification.tag);
});
