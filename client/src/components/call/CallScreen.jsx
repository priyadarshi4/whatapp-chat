import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPhone, FiPhoneOff, FiVideo, FiVideoOff,
  FiMic, FiMicOff, FiMonitor, FiMinimize2,
  FiMaximize2, FiRotateCcw,
} from 'react-icons/fi'
import { useCallStore } from '../../store/callStore'
import { useWebRTC } from '../../hooks/useWebRTC'

function formatDuration(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)
  const [minimized, setMinimized]   = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef(null)

  const otherUser = caller || callee
  const isVisible = ['outgoing', 'connecting', 'active'].includes(callState)

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Auto-hide controls after 4 s of inactivity (video call only)
  const resetControlsTimer = () => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    if (callType === 'video' && callState === 'active') {
      controlsTimer.current = setTimeout(() => setShowControls(false), 4000)
    }
  }
  useEffect(() => {
    resetControlsTimer()
    return () => clearTimeout(controlsTimer.current)
  }, [callState, callType])

  if (!isVisible) return null

  // ── Minimized pip ──────────────────────────────────────────────
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-24 right-4 z-50 w-44 rounded-2xl overflow-hidden bg-[#1a2a32] shadow-2xl border border-white/10 cursor-pointer"
        onClick={() => setMinimized(false)}
      >
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {callType === 'video' && remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img
              src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
            <span className="text-white text-xs font-medium truncate">{otherUser?.name}</span>
            {callState === 'active' && (
              <span className="text-primary-400 text-xs">{formatDuration(callDuration)}</span>
            )}
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

  // ── Full screen ────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* ── Video layout ── */}
      {callType === 'video' ? (
        <div className="flex-1 relative bg-black">
          {/* Remote video (full screen) */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <img
                  src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
                  alt={otherUser?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
              </motion.div>
              <p className="text-white text-xl font-semibold">{otherUser?.name}</p>
              <p className="text-white/60">
                {callState === 'outgoing'   ? 'Calling…' :
                 callState === 'connecting' ? 'Connecting…' : ''}
              </p>
            </div>
          )}

          {/* Local video (PiP) */}
          <motion.div
            drag
            dragMomentum={false}
            className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden bg-[#111] border-2 border-white/20 shadow-xl cursor-grab active:cursor-grabbing"
          >
            {isLocalVideoOn && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a2a32]">
                <FiVideoOff size={20} className="text-white/40" />
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        // ── Audio call ──
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#0d1117] to-[#1a2a32]">
          <motion.div
            animate={callState === 'active'
              ? { boxShadow: ['0 0 0 0 rgba(37,211,102,0.4)', '0 0 0 20px rgba(37,211,102,0)', '0 0 0 0 rgba(37,211,102,0)'] }
              : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="rounded-full"
          >
            <img
              src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name||'U')}&background=2A3942&color=25D366`}
              alt={otherUser?.name}
              className="w-36 h-36 rounded-full object-cover border-4 border-primary-500/30"
            />
          </motion.div>

          <div className="text-center">
            <p className="text-white text-2xl font-semibold">{otherUser?.name}</p>
            {callState === 'active' ? (
              <p className="text-primary-400 text-lg mt-1 font-mono">{formatDuration(callDuration)}</p>
            ) : (
              <p className="text-white/60 mt-1">
                {callState === 'outgoing' ? 'Calling…' : 'Connecting…'}
              </p>
            )}
          </div>

          {/* Audio wave animation when active */}
          {callState === 'active' && (
            <div className="flex items-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                  className="w-1 bg-primary-500 rounded-full"
                  style={{ height: 24 }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-16 left-4 right-4 bg-red-500/90 text-white text-sm px-4 py-2 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* ── Controls overlay ── */}
      <AnimatePresence>
        {(showControls || callType === 'audio') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 pb-10 pt-6 flex flex-col items-center gap-4"
            style={{
              background: callType === 'video'
                ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)'
                : 'transparent'
            }}
          >
            {/* Status bar */}
            <div className="flex items-center gap-3 text-white/70 text-sm">
              {callState === 'active' && callType === 'audio' && null}
              {callType === 'video' && callState === 'active' && (
                <span className="text-white font-mono text-base">{formatDuration(callDuration)}</span>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-4">
              {/* Mute */}
              <ControlBtn
                onClick={toggleLocalAudio}
                active={!isLocalAudioOn}
                icon={isLocalAudioOn ? FiMic : FiMicOff}
                label={isLocalAudioOn ? 'Mute' : 'Unmute'}
              />

              {/* Video toggle (video call only) */}
              {callType === 'video' && (
                <ControlBtn
                  onClick={toggleLocalVideo}
                  active={!isLocalVideoOn}
                  icon={isLocalVideoOn ? FiVideo : FiVideoOff}
                  label={isLocalVideoOn ? 'Camera' : 'Camera off'}
                />
              )}

              {/* End call */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 transition-colors"
              >
                <FiPhoneOff size={26} className="text-white" />
              </motion.button>

              {/* Screen share (video only) */}
              {callType === 'video' && (
                <ControlBtn
                  onClick={toggleScreenShare}
                  active={isScreenSharing}
                  icon={FiMonitor}
                  label={isScreenSharing ? 'Stop share' : 'Share'}
                />
              )}

              {/* Minimize */}
              <ControlBtn
                onClick={() => setMinimized(true)}
                icon={FiMinimize2}
                label="Minimize"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: caller name & minimize on top */}
      <div className="absolute top-0 left-0 right-0 pt-10 pb-4 px-5 flex items-center justify-between"
        style={{ background: callType === 'video' ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'transparent' }}
      >
        <div>
          {callType === 'video' && (
            <p className="text-white font-semibold">{otherUser?.name}</p>
          )}
          {callType === 'video' && callState === 'active' && (
            <p className="text-primary-400 text-sm font-mono">{formatDuration(callDuration)}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ControlBtn({ onClick, active = false, icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={`w-13 h-13 rounded-full flex items-center justify-center transition-colors shadow-lg ${
          active
            ? 'bg-white/90 text-gray-900'
            : 'bg-white/15 hover:bg-white/25 text-white'
        }`}
        style={{ width: 52, height: 52 }}
      >
        <Icon size={22} />
      </motion.button>
      <span className="text-white/60 text-xs">{label}</span>
    </div>
  )
}
