const express = require('express');
module.exports = express.Router().get('/', (_, res) => res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }));
