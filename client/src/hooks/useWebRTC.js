import { useCallback, useRef, useEffect } from 'react'
import { useCallStore } from '../store/callStore'
import { getSocket } from '../socket/socket'

// ─── Module-level singletons ──────────────────────────────────────────────────
// CRITICAL: These must be outside the hook so every call to useWebRTC()
// in any component shares the SAME peer connection reference and timer.
// If they were inside the hook, ChatPage and IncomingCallModal would each
// get their own pcRef — one creates the PC, the other reads null.
let _pc = null          // RTCPeerConnection singleton
let _durationTimer = null

const getPC  = ()    => _pc
const setPC  = (pc)  => { _pc = pc }
const clearPC = ()   => { _pc = null }

// ─── ICE / TURN servers ───────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Open Relay free TURN (works cross-network)
    { urls: 'turn:openrelay.metered.ca:80',                  username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',                 username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp',   username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

// ─── Duration timer (also module-level) ──────────────────────────────────────
const startDurationTimer = () => {
  if (_durationTimer) return
  _durationTimer = setInterval(() => useCallStore.getState().incrementDuration(), 1000)
}
const clearDurationTimer = () => {
  if (_durationTimer) { clearInterval(_durationTimer); _durationTimer = null }
}

// ─── Get user media ───────────────────────────────────────────────────────────
async function getMedia(callType) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: callType === 'video' ? {
      width:     { ideal: 1280 },
      height:    { ideal: 720  },
      frameRate: { ideal: 30   },
      facingMode: 'user',
    } : false,
  })
  useCallStore.getState().setLocalStream(stream)
  return stream
}

// ─── Flush queued ICE candidates once remote desc is set ─────────────────────
async function flushIceQueue(pc) {
  const { iceCandidateQueue } = useCallStore.getState()
  console.log(`[WebRTC] Flushing ${iceCandidateQueue.length} queued ICE candidates`)
  for (const c of iceCandidateQueue) {
    try { await pc.addIceCandidate(new RTCIceCandidate(c)) }
    catch (e) { console.warn('[WebRTC] ICE flush error:', e) }
  }
  useCallStore.getState().clearIceQueue()
}

// ─── Create RTCPeerConnection ─────────────────────────────────────────────────
function createPC(stream) {
  // Close any existing PC first
  if (_pc) { try { _pc.close() } catch {} }

  const pc = new RTCPeerConnection(ICE_SERVERS)
  setPC(pc)
  useCallStore.getState().setPeerConnection(pc)

  // Add local tracks to the connection
  stream.getTracks().forEach(t => pc.addTrack(t, stream))

  // Receive remote tracks
  const remoteStream = new MediaStream()
  useCallStore.getState().setRemoteStream(remoteStream)
  pc.ontrack = (e) => {
    console.log('[WebRTC] Got remote track:', e.track.kind)
    e.streams[0]?.getTracks().forEach(t => {
      if (!remoteStream.getTrackById(t.id)) remoteStream.addTrack(t)
    })
    useCallStore.getState().setRemoteStream(new MediaStream(remoteStream.getTracks()))
  }

  // Send ICE candidates to the other person
  pc.onicecandidate = (e) => {
    if (!e.candidate) return
    const { caller, callee, chatId } = useCallStore.getState()
    const to = callee?._id || caller?._id
    if (!to) { console.warn('[WebRTC] onicecandidate: no target userId'); return }
    console.log('[WebRTC] Sending ICE candidate to', to)
    getSocket()?.emit('webrtc:ice-candidate', { chatId, candidate: e.candidate, to })
  }

  pc.onicegatheringstatechange = () => {
    console.log('[WebRTC] ICE gathering:', pc.iceGatheringState)
  }

  pc.oniceconnectionstatechange = () => {
    const s = pc.iceConnectionState
    console.log('[WebRTC] ICE connection state:', s)
    if (s === 'connected' || s === 'completed') {
      useCallStore.getState().setActive()
      startDurationTimer()
    }
    if (s === 'failed') {
      console.error('[WebRTC] ICE failed — attempting restart')
      pc.restartIce()  // try ICE restart before giving up
      useCallStore.getState().setError('Connection issue — retrying…')
    }
    if (s === 'disconnected') {
      setTimeout(() => {
        if (getPC()?.iceConnectionState === 'disconnected') {
          useCallStore.getState().setError('Connection lost.')
        }
      }, 5000)
    }
  }

  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState)
    if (pc.connectionState === 'failed') {
      useCallStore.getState().setError('Call connection failed.')
    }
    if (pc.connectionState === 'connected') {
      useCallStore.getState().setActive()
      startDurationTimer()
    }
  }

  pc.onsignalingstatechange = () => {
    console.log('[WebRTC] Signaling state:', pc.signalingState)
  }

  return pc
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — all components share the module-level _pc singleton
// ─────────────────────────────────────────────────────────────────────────────
export function useWebRTC() {

  // Cleanup timer on unmount
  useEffect(() => () => clearDurationTimer(), [])

  // ── CALLER: build offer and ring the callee ───────────────────────────────
  const startCall = useCallback(async () => {
    const { callee, chatId, callType } = useCallStore.getState()
    try {
      useCallStore.getState().setConnecting()
      const stream = await getMedia(callType)
      const pc = createPC(stream)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
        voiceActivityDetection: true,
      })
      await pc.setLocalDescription(offer)
      console.log('[WebRTC] Offer created, sending call:incoming to', callee._id)

      // One atomic emit: offer travels with the ring so callee has it immediately
      getSocket()?.emit('call:incoming', { to: callee._id, chatId, callType, offer })
    } catch (err) {
      console.error('[WebRTC] startCall error:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied.' :
        err.name === 'NotFoundError'   ? 'Camera or microphone not found.' :
        'Could not start call: ' + err.message
      )
      useCallStore.getState().reset()
    }
  }, [])

  // ── CALLEE: answer using the stored offer ────────────────────────────────
  const answerCall = useCallback(async () => {
    const { pendingOffer, caller, chatId, callType } = useCallStore.getState()
    if (!pendingOffer) {
      console.error('[WebRTC] answerCall: no pendingOffer in store')
      useCallStore.getState().setError('No offer received — please try again.')
      return
    }
    try {
      useCallStore.getState().setConnecting()
      const stream = await getMedia(callType)
      const pc = createPC(stream)  // creates and stores in module _pc

      console.log('[WebRTC] Setting remote description (offer)')
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer))
      await flushIceQueue(pc)  // flush any ICE that arrived before answer

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      console.log('[WebRTC] Sending answer to', caller._id)
      getSocket()?.emit('webrtc:answer', { to: caller._id, chatId, answer })
    } catch (err) {
      console.error('[WebRTC] answerCall error:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied — please allow and retry.' :
        err.name === 'NotFoundError'   ? 'Camera or microphone not found.' :
        'Could not answer: ' + err.message
      )
      useCallStore.getState().setCallState('incoming')  // stay on ring screen so user can retry
    }
  }, [])

  // ── CALLER receives answer from callee ───────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    const pc = getPC()
    if (!pc) { console.warn('[WebRTC] handleAnswer: no PC'); return }
    if (pc.signalingState === 'closed') { console.warn('[WebRTC] handleAnswer: PC closed'); return }
    console.log('[WebRTC] Setting remote description (answer), signalingState:', pc.signalingState)
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      await flushIceQueue(pc)
    } catch (e) {
      console.error('[WebRTC] handleAnswer error:', e)
    }
  }, [])

  // ── Both sides: add ICE candidate ────────────────────────────────────────
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = getPC()
    if (!pc || pc.signalingState === 'closed') {
      console.log('[WebRTC] Queuing ICE candidate (no PC yet)')
      useCallStore.getState().queueIceCandidate(candidate)
      return
    }
    if (!pc.remoteDescription) {
      console.log('[WebRTC] Queuing ICE candidate (no remote desc yet)')
      useCallStore.getState().queueIceCandidate(candidate)
      return
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('[WebRTC] Added ICE candidate')
    } catch (e) {
      console.warn('[WebRTC] addIceCandidate error:', e)
    }
  }, [])

  // ── Screen share ─────────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const { isScreenSharing } = useCallStore.getState()
    const pc = getPC()
    try {
      if (!isScreenSharing) {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const track  = screen.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(track)
        track.onended = () => toggleScreenShare()
        useCallStore.setState({ isScreenSharing: true })
      } else {
        const cam   = await navigator.mediaDevices.getUserMedia({ video: true })
        const track = cam.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(track)
        useCallStore.setState({ isScreenSharing: false })
      }
    } catch (err) { console.error('[WebRTC] screenShare error:', err) }
  }, [])

  // ── End call ─────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearDurationTimer()
    const { caller, callee, chatId, callState } = useCallStore.getState()
    const to = callee?._id || caller?._id
    if (callState !== 'idle' && to) {
      getSocket()?.emit('call:end', { to, chatId })
    }
    // Close the PC
    if (_pc) { try { _pc.close() } catch {} clearPC() }
    useCallStore.getState().reset()
  }, [])

  // ── Decline incoming ─────────────────────────────────────────────────────
  const declineCall = useCallback(() => {
    const { caller, chatId } = useCallStore.getState()
    if (caller?._id) getSocket()?.emit('call:decline', { to: caller._id, chatId })
    if (_pc) { try { _pc.close() } catch {} clearPC() }
    useCallStore.getState().reset()
  }, [])

  return { startCall, answerCall, handleAnswer, handleIceCandidate, toggleScreenShare, endCall, declineCall }
}
