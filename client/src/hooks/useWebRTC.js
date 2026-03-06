import { useCallback, useRef, useEffect } from 'react'
import { useCallStore } from '../store/callStore'
import { getSocket } from '../socket/socket'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',      username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',     username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
}

export function useWebRTC() {
  const pcRef       = useRef(null)
  const durationRef = useRef(null)

  // ─── helpers ─────────────────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    if (durationRef.current) return
    durationRef.current = setInterval(() => useCallStore.getState().incrementDuration(), 1000)
  }, [])

  const clearDurationTimer = useCallback(() => {
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null }
  }, [])

  useEffect(() => () => clearDurationTimer(), [clearDurationTimer])

  // ─── get user media ───────────────────────────────────────────────────────
  const getMedia = useCallback(async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }
        : false,
    })
    useCallStore.getState().setLocalStream(stream)
    return stream
  }, [])

  // ─── create RTCPeerConnection ─────────────────────────────────────────────
  const createPC = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    useCallStore.getState().setPeerConnection(pc)

    // Add our tracks
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    // Remote stream
    const remoteStream = new MediaStream()
    useCallStore.getState().setRemoteStream(remoteStream)

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => {
        if (!remoteStream.getTrackById(t.id)) remoteStream.addTrack(t)
      })
      // Trigger re-render by setting a new object reference
      useCallStore.getState().setRemoteStream(new MediaStream(remoteStream.getTracks()))
    }

    // ICE — send to the OTHER person
    pc.onicecandidate = (e) => {
      if (!e.candidate) return
      const { caller, callee, chatId } = useCallStore.getState()
      // callee is set on caller side, caller is set on callee side
      const to = callee?._id || caller?._id
      if (!to) return
      getSocket()?.emit('webrtc:ice-candidate', { chatId, candidate: e.candidate, to })
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('[WebRTC] ICE:', state)
      if (state === 'connected' || state === 'completed') {
        useCallStore.getState().setActive()
        startDurationTimer()
      }
      if (state === 'failed') {
        useCallStore.getState().setError('Connection failed — check network / firewall.')
      }
      if (state === 'disconnected') {
        setTimeout(() => {
          if (pcRef.current?.iceConnectionState === 'disconnected') endCall()
        }, 4000)
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') endCall()
    }

    return pc
  }, [startDurationTimer])

  // ─── flush queued ICE candidates ──────────────────────────────────────────
  const flushIceQueue = useCallback(async (pc) => {
    const { iceCandidateQueue } = useCallStore.getState()
    for (const c of iceCandidateQueue) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn)
    }
    useCallStore.getState().clearIceQueue()
  }, [])

  // ─── CALLER: create offer and ring the callee ─────────────────────────────
  const startCall = useCallback(async () => {
    const { callee, chatId, callType } = useCallStore.getState()
    try {
      useCallStore.getState().setConnecting()
      const stream = await getMedia(callType)
      const pc = createPC(stream)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      })
      await pc.setLocalDescription(offer)

      // Single emit: offer travels WITH the ring notification — no ordering race
      getSocket()?.emit('call:incoming', { to: callee._id, chatId, callType, offer })
    } catch (err) {
      console.error('[WebRTC] startCall:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied.' :
        err.name === 'NotFoundError'   ? 'Camera or microphone not found.' :
        'Could not start call: ' + err.message
      )
      useCallStore.getState().reset()
    }
  }, [getMedia, createPC])

  // ─── CALLEE: answer with the stored offer ─────────────────────────────────
  const answerCall = useCallback(async () => {
    const { pendingOffer, caller, chatId, callType } = useCallStore.getState()
    if (!pendingOffer) {
      useCallStore.getState().setError('No offer received — try again.')
      return
    }
    try {
      useCallStore.getState().setConnecting()
      const stream = await getMedia(callType)
      const pc = createPC(stream)

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer))
      await flushIceQueue(pc)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      getSocket()?.emit('webrtc:answer', { to: caller._id, chatId, answer })
    } catch (err) {
      console.error('[WebRTC] answerCall:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied — allow access and try again.' :
        err.name === 'NotFoundError'   ? 'Camera or microphone not found.' :
        'Could not answer call: ' + err.message
      )
      // Go back to incoming so user can retry, not reset
      useCallStore.getState().setCallState('incoming')
    }
  }, [getMedia, createPC, flushIceQueue])

  // ─── CALLER receives answer ───────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    const pc = pcRef.current
    if (!pc || pc.signalingState === 'closed') return
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await flushIceQueue(pc)
  }, [flushIceQueue])

  // ─── Both sides handle ICE ────────────────────────────────────────────────
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current
    if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn)
    } else {
      useCallStore.getState().queueIceCandidate(candidate)
    }
  }, [])

  // ─── Screen share toggle ──────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const { isScreenSharing } = useCallStore.getState()
    const pc = pcRef.current
    try {
      if (!isScreenSharing) {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const track  = screen.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(track)
        track.onended = () => toggleScreenShare()
        useCallStore.setState({ isScreenSharing: true })
      } else {
        const cam    = await navigator.mediaDevices.getUserMedia({ video: true })
        const track  = cam.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(track)
        useCallStore.setState({ isScreenSharing: false })
      }
    } catch (err) { console.error('[WebRTC] screenShare:', err) }
  }, [])

  // ─── End call ─────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearDurationTimer()
    const { caller, callee, chatId, callState } = useCallStore.getState()
    const to = callee?._id || caller?._id
    if (callState !== 'idle' && to) {
      getSocket()?.emit('call:end', { to, chatId })
    }
    useCallStore.getState().reset()
  }, [clearDurationTimer])

  // ─── Decline incoming ─────────────────────────────────────────────────────
  const declineCall = useCallback(() => {
    const { caller, chatId } = useCallStore.getState()
    if (caller?._id) getSocket()?.emit('call:decline', { to: caller._id, chatId })
    useCallStore.getState().reset()
  }, [])

  return { startCall, answerCall, handleAnswer, handleIceCandidate, toggleScreenShare, endCall, declineCall }
}
