// ChatApp Service Worker v2
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  let payload = { title: 'ChatApp', body: 'New message', icon: '/chat-icon.svg', tag: 'chatapp', data: { url: '/', chatId: null } };
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; } catch(e) { payload.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/chat-icon.svg',
      badge: '/chat-icon.svg',
      tag: payload.tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          w.focus();
          if (chatId) w.postMessage({ type: 'OPEN_CHAT', chatId });
          return;
        }
      }
      return self.clients.openWindow('/');
    })
  );
});
