import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi'
import { useCallStore } from '../../store/callStore'
import { useWebRTC } from '../../hooks/useWebRTC'

export default function IncomingCallModal() {
  const { callState, caller, callType, error } = useCallStore()
  const { answerCall, declineCall } = useWebRTC()
  const ringRef = useRef(null)

  // Play ringtone while ringing
  useEffect(() => {
    if (callState !== 'incoming') return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      let active = true
      const ring = () => {
        if (!active) return
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 420
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.6)
        setTimeout(() => { if (active) ring() }, 1400)
      }
      ring()
      ringRef.current = () => { active = false; setTimeout(() => ctx.close(), 100) }
    } catch {}
    return () => ringRef.current?.()
  }, [callState])

  const stopRing = () => { ringRef.current?.(); ringRef.current = null }

  const handleAnswer  = () => { stopRing(); answerCall()  }
  const handleDecline = () => { stopRing(); declineCall() }

  if (callState !== 'incoming') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-gradient-to-b from-[#1a2a32] to-[#0d1117] rounded-3xl shadow-2xl p-8 w-80 flex flex-col items-center gap-6 border border-white/10"
      >
        {/* Pulsing avatar */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute w-28 h-28 rounded-full bg-primary-500"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
            className="absolute w-24 h-24 rounded-full bg-primary-500"
          />
          <img
            src={caller?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(caller?.name || 'U')}&background=2A3942&color=25D366`}
            alt={caller?.name}
            className="w-20 h-20 rounded-full object-cover relative z-10"
          />
        </div>

        <div className="text-center">
          <p className="text-white font-semibold text-xl">{caller?.name || 'Unknown'}</p>
          <p className="text-white/60 text-sm mt-1 flex items-center justify-center gap-1.5">
            {callType === 'video' ? <FiVideo size={14} /> : <FiPhone size={14} />}
            Incoming {callType === 'video' ? 'video' : 'voice'} call…
          </p>
          {/* Error shown inline so user can retry */}
          {error && (
            <p className="text-red-400 text-xs mt-2 px-2">{error}</p>
          )}
        </div>

        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleDecline}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors">
              <FiPhoneOff size={24} className="text-white" />
            </motion.button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleAnswer}
              className="w-16 h-16 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 transition-colors">
              {callType === 'video' ? <FiVideo size={24} className="text-white" /> : <FiPhone size={24} className="text-white" />}
            </motion.button>
            <span className="text-white/50 text-xs">{error ? 'Retry' : 'Answer'}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

