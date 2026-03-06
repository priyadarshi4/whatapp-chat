import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi'
import { useCallStore } from '../../store/callStore'
import { useWebRTC } from '../../hooks/useWebRTC'

// Stored offer while user decides whether to answer
let pendingOffer = null
export const setPendingOffer = (offer) => { pendingOffer = offer }
export const getPendingOffer = () => pendingOffer

export default function IncomingCallModal() {
  const { callState, caller, callType } = useCallStore()
  const { answerCall, declineCall } = useWebRTC()
  const ringRef = useRef(null)

  const isVisible = callState === 'incoming'

  // Play ringtone
  useEffect(() => {
    if (!isVisible) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      let playing = true
      const ring = () => {
        if (!playing) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 440
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
        setTimeout(() => { if (playing) ring() }, 1200)
      }
      ring()
      ringRef.current = () => { playing = false; ctx.close() }
    } catch {}
    return () => ringRef.current?.()
  }, [isVisible])

  const handleAnswer = () => {
    ringRef.current?.()
    answerCall(pendingOffer)
    pendingOffer = null
  }

  const handleDecline = () => {
    ringRef.current?.()
    declineCall()
    pendingOffer = null
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 40 }}
        className="bg-gradient-to-b from-[#1a2a32] to-[#0d1117] rounded-3xl shadow-2xl p-8 w-80 flex flex-col items-center gap-6 border border-white/10"
      >
        {/* Pulsing avatar */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary-500 opacity-20"
          />
          <img
            src={caller?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(caller?.name || 'U')}&background=2A3942&color=25D366`}
            alt={caller?.name}
            className="w-24 h-24 rounded-full object-cover relative z-10 border-4 border-primary-500/30"
          />
        </div>

        <div className="text-center">
          <p className="text-white font-semibold text-xl">{caller?.name}</p>
          <p className="text-white/60 text-sm mt-1 flex items-center justify-center gap-1.5">
            {callType === 'video' ? <FiVideo size={14} /> : <FiPhone size={14} />}
            Incoming {callType === 'video' ? 'video' : 'voice'} call…
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-10">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDecline}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
            >
              <FiPhoneOff size={24} className="text-white" />
            </motion.button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAnswer}
              className="w-16 h-16 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 transition-colors"
            >
              {callType === 'video'
                ? <FiVideo size={24} className="text-white" />
                : <FiPhone size={24} className="text-white" />}
            </motion.button>
            <span className="text-white/50 text-xs">Answer</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
