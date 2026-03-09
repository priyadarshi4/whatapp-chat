const webpush = require('web-push');

let configured = false;

function initWebPush() {
  if (configured) return;

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  configured = true;
}

function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { initWebPush, sendPushNotification };