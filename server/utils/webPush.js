const webPush = require('web-push');

// VAPID keys — generate once and store in .env
// To generate: node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@chatapp.com';

let initialized = false;

const initWebPush = () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  VAPID keys not set — push notifications disabled');
    return;
  }
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  initialized = true;
  console.log('🔔 Web Push initialized');
};

/**
 * Send a push notification to a subscription endpoint
 * @param {Object} subscription - PushSubscription object from browser
 * @param {Object} payload - Notification data
 */
const sendPushNotification = async (subscription, payload) => {
  if (!initialized) return null;
  if (!subscription || !subscription.endpoint) return null;

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 410 Gone = subscription expired/unsubscribed
    if (err.statusCode === 410 || err.statusCode === 404) {
      return 'expired';
    }
    console.error('Push notification error:', err.message);
    return null;
  }
};

/**
 * Send push notification to a user (handles subscription cleanup)
 */
const notifyUser = async (user, payload) => {
  if (!user?.pushSubscription) return;

  const result = await sendPushNotification(user.pushSubscription, payload);

  // Clean up expired subscription
  if (result === 'expired') {
    const User = require('../models/User');
    await User.findByIdAndUpdate(user._id, { pushSubscription: null }).catch(() => {});
  }
};

module.exports = { initWebPush, sendPushNotification, notifyUser };
