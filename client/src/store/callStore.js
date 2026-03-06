import { create } from 'zustand'

export const useCallStore = create((set, get) => ({
  callState: 'idle',   // idle | outgoing | incoming | connecting | active
  callType: null,      // audio | video
  caller: null,        // who is calling (populated on callee side)
  callee: null,        // who is being called (populated on caller side)
  chatId: null,
  callDuration: 0,
  error: null,

  localStream: null,
  remoteStream: null,
  isLocalVideoOn: true,
  isLocalAudioOn: true,
  isScreenSharing: false,

  peerConnection: null,
  pendingOffer: null,        // offer stored before user hits Answer
  iceCandidateQueue: [],     // ICE candidates buffered before remote desc set

  setCallState: (s) => set({ callState: s }),
  setError: (e) => set({ error: e }),

  // Caller sets this — caller = current user, callee = other person
  startOutgoingCall: ({ callee, chatId, callType, caller }) =>
    set({ callState: 'outgoing', callee, caller, chatId, callType, error: null, callDuration: 0 }),

  // Callee sets this — caller = person who called, chatId, callType
  receiveIncomingCall: ({ caller, chatId, callType }) =>
    set({ callState: 'incoming', caller, chatId, callType, error: null }),

  setPendingOffer: (offer) => set({ pendingOffer: offer }),

  setConnecting: () => set({ callState: 'connecting' }),
  setActive:     () => set({ callState: 'active' }),

  setLocalStream:    (s) => set({ localStream: s }),
  setRemoteStream:   (s) => set({ remoteStream: s }),
  setPeerConnection: (p) => set({ peerConnection: p }),

  queueIceCandidate: (c) => set(s => ({ iceCandidateQueue: [...s.iceCandidateQueue, c] })),
  clearIceQueue:     ()  => set({ iceCandidateQueue: [] }),

  toggleLocalAudio: () => {
    const { localStream } = get()
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    set(s => ({ isLocalAudioOn: !s.isLocalAudioOn }))
  },
  toggleLocalVideo: () => {
    const { localStream } = get()
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    set(s => ({ isLocalVideoOn: !s.isLocalVideoOn }))
  },

  incrementDuration: () => set(s => ({ callDuration: s.callDuration + 1 })),

  reset: () => {
    const { localStream } = get()
    // Stop all local media tracks
    localStream?.getTracks().forEach(t => t.stop())
    // Note: peerConnection is closed by useWebRTC endCall/declineCall directly
    // on the module-level singleton — don't close the stale store reference here
    set({
      callState: 'idle', callType: null, caller: null, callee: null,
      chatId: null, callDuration: 0, error: null,
      localStream: null, remoteStream: null,
      isLocalVideoOn: true, isLocalAudioOn: true, isScreenSharing: false,
      peerConnection: null, pendingOffer: null, iceCandidateQueue: [],
    })
  },
}))
