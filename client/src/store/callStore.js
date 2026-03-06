import { create } from 'zustand'

// Call states: idle → ringing → connecting → active → ended
export const useCallStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  callState: 'idle',          // 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended'
  callType: null,             // 'audio' | 'video'
  caller: null,               // user object of the person who called
  callee: null,               // user object being called
  chatId: null,
  callDuration: 0,            // seconds
  error: null,

  // Media state
  localStream: null,
  remoteStream: null,
  isLocalVideoOn: true,
  isLocalAudioOn: true,
  isRemoteVideoOn: true,
  isScreenSharing: false,

  // WebRTC internals
  peerConnection: null,
  iceCandidateQueue: [],      // buffer ICE candidates before remote desc is set

  // ── Actions ────────────────────────────────────────────────────
  setCallState: (callState) => set({ callState }),
  setError: (error) => set({ error }),

  startOutgoingCall: ({ callee, chatId, callType }) =>
    set({ callState: 'outgoing', callee, chatId, callType, error: null, callDuration: 0 }),

  receiveIncomingCall: ({ caller, chatId, callType }) =>
    set({ callState: 'incoming', caller, chatId, callType, error: null }),

  setConnecting: () => set({ callState: 'connecting' }),
  setActive: () => set({ callState: 'active' }),

  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setPeerConnection: (peerConnection) => set({ peerConnection }),

  queueIceCandidate: (candidate) =>
    set(state => ({ iceCandidateQueue: [...state.iceCandidateQueue, candidate] })),
  clearIceQueue: () => set({ iceCandidateQueue: [] }),

  toggleLocalAudio: () => {
    const { localStream } = get()
    if (!localStream) return
    localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    set(state => ({ isLocalAudioOn: !state.isLocalAudioOn }))
  },

  toggleLocalVideo: () => {
    const { localStream } = get()
    if (!localStream) return
    localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    set(state => ({ isLocalVideoOn: !state.isLocalVideoOn }))
  },

  incrementDuration: () => set(state => ({ callDuration: state.callDuration + 1 })),

  reset: () => {
    const { localStream, peerConnection } = get()
    // Clean up media tracks
    if (localStream) localStream.getTracks().forEach(t => t.stop())
    // Close peer connection
    if (peerConnection) peerConnection.close()
    set({
      callState: 'idle',
      callType: null,
      caller: null,
      callee: null,
      chatId: null,
      callDuration: 0,
      error: null,
      localStream: null,
      remoteStream: null,
      isLocalVideoOn: true,
      isLocalAudioOn: true,
      isRemoteVideoOn: true,
      isScreenSharing: false,
      peerConnection: null,
      iceCandidateQueue: [],
    })
  },
}))
