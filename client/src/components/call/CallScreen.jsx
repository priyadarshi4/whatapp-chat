import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPhoneOff, FiVideo, FiVideoOff,
  FiMic, FiMicOff, FiMonitor, FiMinimize2, FiMaximize2,
} from 'react-icons/fi'
import { useCallStore } from '../../store/callStore'
import { useWebRTC } from '../../hooks/useWebRTC'

function formatDuration(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ── ref-callback helpers ──────────────────────────────────────────────────────
// These attach srcObject as soon as the element mounts, not on a separate effect.
// This avoids the race where useEffect fires before the conditional <video> renders.
function useVideoRef(stream) {
  return useCallback((el) => {
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream
        el.play().catch(() => {})
      }
    }
  }, [stream])
}

export default function CallScreen() {
  const {
    callState, callType, callDuration, error,
    caller, callee,
    localStream, remoteStream,
    isLocalAudioOn, isLocalVideoOn, isScreenSharing,
    toggleLocalAudio, toggleLocalVideo,
  } = useCallStore()

  const { endCall, toggleScreenShare } = useWebRTC()
  const [minimized, setMinimized] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef(null)

  const otherUser = callee || caller   // caller side has callee; callee side has caller
  const isVisible = ['outgoing', 'connecting', 'active'].includes(callState)

  // ref callbacks — attach stream the moment the element mounts
  const localVideoRef  = useVideoRef(localStream)
  const remoteVideoRef = useVideoRef(remoteStream)

  // Also a plain ref for the hidden audio element (audio calls)
  const remoteAudioRef = useRef(null)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  // Auto-hide controls during active video call
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    if (callType === 'video' && callState === 'active') {
      controlsTimer.current = setTimeout(() => setShowControls(false), 4000)
    }
  }, [callType, callState])

  useEffect(() => {
    resetControlsTimer()
    return () => clearTimeout(controlsTimer.current)
  }, [callState, callType, resetControlsTimer])

  if (!isVisible) return null

  // ── Minimised PiP ─────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-24 right-4 z-50 w-44 rounded-2xl overflow-hidden bg-[#1a2a32] shadow-2xl border border-white/10 cursor-pointer"
        onClick={() => setMinimized(false)}
      >
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {callType === 'video' ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img
              src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
              alt="" className="w-12 h-12 rounded-full"
            />
          )}
          <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
            <span className="text-white text-xs font-medium truncate">{otherUser?.name}</span>
            {callState === 'active' && <span className="text-primary-400 text-xs font-mono">{formatDuration(callDuration)}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <button onClick={(e) => { e.stopPropagation(); endCall() }}
            className="flex items-center gap-1 text-red-400 text-xs hover:text-red-300">
            <FiPhoneOff size={12} /> End
          </button>
          <FiMaximize2 size={12} className="text-white/40" />
        </div>
      </motion.div>
    )
  }

  // ── Full-screen call UI ───────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* Hidden audio element — always present so remote audio plays on audio calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {callType === 'video' ? (
        /* ── VIDEO CALL ──────────────────────────────────────────── */
        <div className="flex-1 relative bg-black overflow-hidden">
          {/* Remote video — full screen background */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay when remote video hasn't arrived yet */}
          {(!remoteStream || callState !== 'active') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#0d1117] to-[#1a2a32]">
              <motion.img
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
                alt={otherUser?.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
              />
              <p className="text-white text-xl font-semibold">{otherUser?.name}</p>
              <p className="text-white/50 text-sm">
                {callState === 'outgoing' ? 'Calling…' : callState === 'connecting' ? 'Connecting…' : 'Connected'}
              </p>
            </div>
          )}

          {/* Draggable local PiP */}
          <motion.div
            drag dragMomentum={false}
            className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden bg-[#111] border-2 border-white/20 shadow-xl z-10 cursor-grab active:cursor-grabbing"
          >
            {isLocalVideoOn && localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a2a32]">
                <FiVideoOff size={20} className="text-white/40" />
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        /* ── AUDIO CALL ──────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#0d1117] to-[#1a2a32]">
          {/* Pulsing ring when active */}
          <div className="relative flex items-center justify-center">
            {callState === 'active' && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-44 h-44 rounded-full bg-primary-500"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="absolute w-44 h-44 rounded-full bg-primary-500"
                />
              </>
            )}
            <img
              src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
              alt={otherUser?.name}
              className="w-36 h-36 rounded-full object-cover border-4 border-primary-500/30 relative z-10"
            />
          </div>

          <div className="text-center">
            <p className="text-white text-2xl font-semibold">{otherUser?.name}</p>
            {callState === 'active' ? (
              <p className="text-primary-400 text-lg mt-1 font-mono">{formatDuration(callDuration)}</p>
            ) : (
              <p className="text-white/50 mt-1 text-sm">
                {callState === 'outgoing' ? 'Calling…' : 'Connecting…'}
              </p>
            )}
          </div>

          {/* Sound wave animation */}
          {callState === 'active' && (
            <div className="flex items-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <motion.div key={i}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1.5 bg-primary-500 rounded-full"
                  style={{ height: 28 }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/90 backdrop-blur text-white text-sm px-4 py-2.5 rounded-xl text-center z-20">
          {error}
        </div>
      )}

      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 pt-safe px-5 pt-4 pb-6 flex items-start justify-between z-10 pointer-events-none"
        style={{ background: callType === 'video' ? 'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 100%)' : 'transparent' }}
      >
        <div>
          {callType === 'video' && callState === 'active' && (
            <>
              <p className="text-white font-semibold text-base">{otherUser?.name}</p>
              <p className="text-primary-400 text-sm font-mono">{formatDuration(callDuration)}</p>
            </>
          )}
        </div>
      </div>

      {/* Controls overlay */}
      <AnimatePresence>
        {(showControls || callType === 'audio') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 pb-10 pt-8 flex flex-col items-center gap-3 z-10"
            style={{ background: callType === 'video' ? 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)' : 'transparent' }}
          >
            <div className="flex items-center gap-5">
              <ControlBtn onClick={toggleLocalAudio}  active={!isLocalAudioOn}  Icon={isLocalAudioOn ? FiMic : FiMicOff}           label={isLocalAudioOn ? 'Mute' : 'Unmute'} />
              {callType === 'video' && (
                <ControlBtn onClick={toggleLocalVideo} active={!isLocalVideoOn} Icon={isLocalVideoOn ? FiVideo : FiVideoOff}       label={isLocalVideoOn ? 'Camera' : 'Cam off'} />
              )}
              {/* End call */}
              <motion.div className="flex flex-col items-center gap-1.5">
                <motion.button whileTap={{ scale: 0.88 }} onClick={endCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 transition-colors">
                  <FiPhoneOff size={26} className="text-white" />
                </motion.button>
                <span className="text-white/60 text-xs">End</span>
              </motion.div>
              {callType === 'video' && (
                <ControlBtn onClick={toggleScreenShare} active={isScreenSharing} Icon={FiMonitor} label={isScreenSharing ? 'Stop' : 'Share'} />
              )}
              <ControlBtn onClick={() => setMinimized(true)} Icon={FiMinimize2} label="Minimize" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ControlBtn({ onClick, active = false, Icon, label }) {
  return (
    <motion.div className="flex flex-col items-center gap-1.5">
      <motion.button whileTap={{ scale: 0.88 }} onClick={onClick}
        className={`w-13 h-13 rounded-full flex items-center justify-center transition-colors shadow-lg ${active ? 'bg-white text-gray-900' : 'bg-white/15 hover:bg-white/25 text-white'}`}
        style={{ width: 52, height: 52 }}>
        <Icon size={22} />
      </motion.button>
      <span className="text-white/60 text-xs">{label}</span>
    </motion.div>
  )
}
