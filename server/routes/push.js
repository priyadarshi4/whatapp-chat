const express = require('express');
module.exports = express.Router().get('/vapid', (_, res) => res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' }));
