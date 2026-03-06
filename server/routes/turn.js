const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * GET /api/turn/credentials
 * Returns fresh TURN credentials.
 *
 * Supports two modes based on env vars:
 *   1. METERED_API_KEY  → fetches live credentials from Metered.ca (recommended)
 *   2. Manual env vars  → TURN_URL, TURN_USERNAME, TURN_CREDENTIAL
 *   3. Fallback         → well-known free STUN only (same-network only)
 */
router.get('/credentials', protect, async (req, res) => {
  try {
    let iceServers = []

    // ── Mode 1: Metered.ca (best option — free tier = 50GB/mo) ──────────────
    if (process.env.METERED_API_KEY && process.env.METERED_APP_NAME) {
      const url = `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
      const response = await fetch(url)
      if (response.ok) {
        iceServers = await response.json()
        console.log('[TURN] Fetched', iceServers.length, 'ICE servers from Metered')
        return res.json({ iceServers })
      }
      console.warn('[TURN] Metered fetch failed:', response.status)
    }

    // ── Mode 2: Self-hosted / manual TURN env vars ───────────────────────────
    if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: process.env.TURN_URL,
          username: process.env.TURN_USERNAME,
          credential: process.env.TURN_CREDENTIAL,
        },
      ]
      console.log('[TURN] Using manual TURN env vars')
      return res.json({ iceServers })
    }

    // ── Mode 3: STUN-only fallback (works on same network / simple NAT) ─────
    console.warn('[TURN] No TURN config found — falling back to STUN only. Cross-network calls may fail.')
    iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ]
    return res.json({ iceServers, warning: 'No TURN server configured — cross-network calls may fail' })

  } catch (err) {
    console.error('[TURN] Error fetching credentials:', err)
    // Always return something so the call can at least try
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    })
  }
})

module.exports = router
