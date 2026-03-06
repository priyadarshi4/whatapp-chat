import { useCallback, useRef, useEffect } from 'react'
import { useCallStore } from '../store/callStore'
import { getSocket } from '../socket/socket'

// ── STUN/TURN config ─────────────────────────────────────────────────────────
// Uses Google's free STUN + Open Relay TURN servers for good connectivity
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
}

export function useWebRTC() {
  const {
    callType, chatId, callState,
    setLocalStream, setRemoteStream, setPeerConnection,
    setConnecting, setActive, setCallState,
    queueIceCandidate, iceCandidateQueue, clearIceQueue,
    reset, localStream, peerConnection,
  } = useCallStore()

  const pcRef = useRef(null)
  const durationRef = useRef(null)

  // ── Get user media ─────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type = callType) => {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: type === 'video' ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user',
      } : false,
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    setLocalStream(stream)
    return stream
  }, [callType, setLocalStream])

  // ── Create peer connection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    setPeerConnection(pc)

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Remote stream
    const remoteStream = new MediaStream()
    setRemoteStream(remoteStream)
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track))
      setRemoteStream(new MediaStream(remoteStream.getTracks()))
    }

    // ICE candidates → relay to peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket()
        const { chatId, caller, callee } = useCallStore.getState()
        const to = caller?._id || callee?._id
        socket?.emit('webrtc:ice-candidate', { chatId, candidate: event.candidate, to })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setActive()
        startDurationTimer()
      }
      if (pc.iceConnectionState === 'failed') {
        useCallStore.getState().setError('Connection failed. Check your network.')
      }
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (pcRef.current?.iceConnectionState === 'disconnected') {
            endCall()
          }
        }, 3000)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState)
      if (pc.connectionState === 'failed') endCall()
    }

    return pc
  }, [setPeerConnection, setRemoteStream, setActive])

  // ── Start as caller (create offer) ────────────────────────────────────────
  const startCall = useCallback(async () => {
    try {
      setConnecting()
      const stream = await getMedia()
      const pc = createPeerConnection(stream)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
        voiceActivityDetection: true,
      })
      await pc.setLocalDescription(offer)

      const socket = getSocket()
      const { callee, chatId, callType: ct, caller } = useCallStore.getState()
      
      // Send call invitation
      socket?.emit('call:incoming', {
        to: callee._id,
        from: caller?._id,
        chatId,
        callType: ct,
      })

      // Send the offer
      socket?.emit('webrtc:offer', { chatId, offer, to: callee._id })
    } catch (err) {
      console.error('[WebRTC] startCall error:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied.' :
        err.name === 'NotFoundError'   ? 'Camera or microphone not found.' :
        'Could not start call.'
      )
    }
  }, [getMedia, createPeerConnection, callType, setConnecting])

  // ── Answer incoming call ───────────────────────────────────────────────────
  const answerCall = useCallback(async (offer) => {
    try {
      setConnecting()
      const stream = await getMedia()
      const pc = createPeerConnection(stream)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      // Flush queued ICE candidates
      const { iceCandidateQueue: queue } = useCallStore.getState()
      for (const candidate of queue) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn)
      }
      clearIceQueue()

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const socket = getSocket()
      const { caller, chatId } = useCallStore.getState()
      socket?.emit('webrtc:answer', { chatId, answer, to: caller._id })
    } catch (err) {
      console.error('[WebRTC] answerCall error:', err)
      useCallStore.getState().setError(
        err.name === 'NotAllowedError' ? 'Camera/mic permission denied.' : 'Could not answer call.'
      )
    }
  }, [getMedia, createPeerConnection, clearIceQueue, setConnecting])

  // ── Handle incoming offer (called by ChatPage socket listener) ────────────
  const handleOffer = useCallback(async (offer) => {
    // If we already have a PC (answered), set remote desc
    const pc = pcRef.current || useCallStore.getState().peerConnection
    if (pc && pc.signalingState !== 'closed') {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      // Flush queued ICE
      const { iceCandidateQueue: queue } = useCallStore.getState()
      for (const c of queue) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn)
      clearIceQueue()
    }
  }, [clearIceQueue])

  // ── Handle incoming answer ────────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    const pc = pcRef.current || useCallStore.getState().peerConnection
    if (pc && pc.signalingState !== 'closed') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      // Flush any queued ICE candidates
      const { iceCandidateQueue: queue } = useCallStore.getState()
      for (const c of queue) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn)
      clearIceQueue()
    }
  }, [clearIceQueue])

  // ── Handle incoming ICE candidate ─────────────────────────────────────────
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current || useCallStore.getState().peerConnection
    if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn)
    } else {
      queueIceCandidate(candidate)
    }
  }, [queueIceCandidate])

  // ── Toggle screen share ───────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const { isScreenSharing, localStream } = useCallStore.getState()
    const pc = pcRef.current

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(screenTrack)

        screenTrack.onended = () => {
          toggleScreenShare()
        }

        useCallStore.setState({ isScreenSharing: true })
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const camTrack = camStream.getVideoTracks()[0]
        const sender = pc?.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(camTrack)
        useCallStore.setState({ isScreenSharing: false })
      }
    } catch (err) {
      console.error('[WebRTC] Screen share error:', err)
    }
  }, [])

  // ── End call ─────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearDurationTimer()
    const socket = getSocket()
    const { caller, callee, chatId, callState } = useCallStore.getState()
    const otherId = caller?._id || callee?._id

    if (callState !== 'idle' && otherId) {
      socket?.emit('call:end', { to: otherId, chatId })
    }
    reset()
  }, [reset])

  const declineCall = useCallback(() => {
    const socket = getSocket()
    const { caller, chatId } = useCallStore.getState()
    if (caller?._id) socket?.emit('call:decline', { to: caller._id, chatId })
    reset()
  }, [reset])

  // ── Duration timer ────────────────────────────────────────────────────────
  const startDurationTimer = () => {
    if (durationRef.current) return
    durationRef.current = setInterval(() => {
      useCallStore.getState().incrementDuration()
    }, 1000)
  }
  const clearDurationTimer = () => {
    if (durationRef.current) {
      clearInterval(durationRef.current)
      durationRef.current = null
    }
  }

  useEffect(() => () => clearDurationTimer(), [])

  return {
    startCall,
    answerCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleScreenShare,
    endCall,
    declineCall,
    getMedia,
  }
}
