const webpush = require('web-push');

let configured = false;

function initWebPush() {
  if (configured) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_EMAIL) {
    console.log('⚠️  VAPID keys not set — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
  console.log('✅ Web Push configured');
}

async function sendPushNotification(subscription, payload) {
  if (!configured) {
    initWebPush();
    if (!configured) return; // still not configured, skip silently
  }
  if (!subscription?.endpoint) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // 410 = subscription expired/invalid, ignore
    if (err.statusCode !== 410) {
      console.log('Push send error:', err.message);
    }
  }
}

// Auto-init on require
initWebPush();

module.exports = { initWebPush, sendPushNotification };
