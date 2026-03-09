self.addEventListener("push", function (event) {
  if (!event.data) return;
  
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: "open", title: "Open 💕" },
      { action: "dismiss", title: "Dismiss" }
    ],
    requireInteraction: false,
    tag: data.data?.url || "couple-chat", // group notifications by page
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Handle push subscription change
self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("Push subscription changed");
});
