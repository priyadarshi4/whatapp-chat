const webpush = require('web-push');

let _initialized = false;

const initWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@chatapp.com';

  if (!publicKey || !privateKey) {
    console.warn('=========================================');
    console.warn('⚠️  VAPID KEYS MISSING — push notifications DISABLED');
    console.warn('   Run: node scripts/generateVapidKeys.js');
    console.warn('   Then add keys to server/.env');
    console.warn('=========================================');
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    _initialized = true;
    console.log('✅ Web Push (VAPID) initialized');
    console.log('   Public key:', publicKey.substring(0, 20) + '...');
    return true;
  } catch (err) {
    console.error('❌ VAPID init failed:', err.message);
    return false;
  }
};

const sendPushToUser = async (user, payload) => {
  if (!_initialized) {
    console.warn('[Push] Not initialized — skipping push for', user?.name);
    return false;
  }

  if (!user?.pushSubscription?.endpoint) {
    console.log('[Push] No subscription for user', user?.name);
    return false;
  }

  const payloadStr = JSON.stringify(payload);
  console.log(`[Push] Sending to ${user.name}: "${payload.body}"`);

  try {
    const result = await webpush.sendNotification(
      user.pushSubscription,
      payloadStr,
      {
        TTL: 86400,        // 24 hours
        urgency: 'high',
        topic: 'chat-message',
      }
    );
    console.log(`[Push] ✅ Sent to ${user.name}, status: ${result.statusCode}`);
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[Push] Subscription expired for ${user.name} — cleaning up`);
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(user._id, { pushSubscription: null });
      } catch {}
      return 'expired';
    }
    console.error(`[Push] ❌ FAILED for ${user.name}:`, err.statusCode, err.body || err.message);
    return false;
  }
};

module.exports = { initWebPush, sendPushToUser };
