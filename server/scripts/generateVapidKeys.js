#!/usr/bin/env node
/**
 * Run this script once to generate VAPID keys for push notifications.
 * Then copy the output into your server/.env file.
 *
 * Usage:
 *   cd server
 *   node scripts/generateVapidKeys.js
 */

const webPush = require('web-push');

const keys = webPush.generateVAPIDKeys();

console.log('\n✅ VAPID Keys Generated!\n');
console.log('Copy these into your server/.env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@chatapp.com`);
console.log('\n⚠️  Keep VAPID_PRIVATE_KEY secret — never commit it to git!\n');
