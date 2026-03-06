import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiTrash2, FiEye, FiChevronLeft, FiChevronRight, FiVolume2, FiVolumeX } from 'react-icons/fi'
import { useStatusStore } from '../../store/statusStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const STATUS_DURATION = 5000 // 5 s per image

export default function StatusViewer({ groups, startGroupIndex = 0, onClose }) {
  const { markViewed, deleteStatus } = useStatusStore()
  const { user } = useAuthStore()

  const [groupIdx, setGroupIdx]   = useState(startGroupIndex)
  const [statusIdx, setStatusIdx] = useState(0)
  const [progress, setProgress]   = useState(0)
  const [paused, setPaused]       = useState(false)
  const [muted, setMuted]         = useState(false)
  const [viewers, setViewers]     = useState(null)
  const [showViewers, setShowViewers] = useState(false)

  const videoRef   = useRef()
  const timerRef   = useRef()
  const startRef   = useRef()
  const elapsed    = useRef(0)

  const group  = groups[groupIdx]
  const status = group?.statuses?.[statusIdx]
  const isOwn  = status?.userId?._id === user._id || status?.userId === user._id

  // Mark viewed
  useEffect(() => {
    if (status && !isOwn) markViewed(status._id)
  }, [status?._id])

  // Load viewers for own statuses
  useEffect(() => {
    if (isOwn && status?._id) {
      api.get(`/status/${status._id}/viewers`)
        .then(r => setViewers(r.data.viewers))
        .catch(() => {})
    } else {
      setViewers(null)
      setShowViewers(false)
    }
  }, [status?._id, isOwn])

  const goNext = useCallback(() => {
    elapsed.current = 0
    clearInterval(timerRef.current)
    if (statusIdx < group.statuses.length - 1) {
      setStatusIdx(i => i + 1)
      setProgress(0)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1)
      setStatusIdx(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [statusIdx, groupIdx, group, groups, onClose])

  const goPrev = useCallback(() => {
    elapsed.current = 0
    clearInterval(timerRef.current)
    setProgress(0)
    if (statusIdx > 0) {
      setStatusIdx(i => i - 1)
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1)
      setStatusIdx(0)
    }
  }, [statusIdx, groupIdx])

  // Progress timer
  useEffect(() => {
    if (!status || paused) return
    const isVideo = status.mediaType === 'video'
    if (isVideo) return // video drives its own progress via timeupdate

    const tick = 50
    const duration = STATUS_DURATION
    startRef.current = Date.now() - elapsed.current

    timerRef.current = setInterval(() => {
      const el = Date.now() - startRef.current
      elapsed.current = el
      const pct = Math.min((el / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) goNext()
    }, tick)

    return () => clearInterval(timerRef.current)
  }, [status?._id, paused, goNext])

  // Video progress
  const handleTimeUpdate = () => {
    const vid = videoRef.current
    if (!vid || !vid.duration) return
    setProgress((vid.currentTime / vid.duration) * 100)
  }
  const handleVideoEnded = () => goNext()

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    paused ? vid.pause() : vid.play().catch(() => {})
  }, [paused])

  const handleDelete = async () => {
    if (!window.confirm('Delete this status?')) return
    await deleteStatus(status._id)
    toast.success('Status deleted')
    goNext()
  }

  if (!group || !status) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
        {group.statuses.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < statusIdx ? '100%' : i === statusIdx ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-3 px-4">
        <img
          src={group.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.user.name)}&background=2A3942&color=25D366`}
          alt={group.user.name}
          className="w-9 h-9 rounded-full object-cover border-2 border-white/40"
        />
        <div className="flex-1">
          <p className="text-white font-medium text-sm">{group.user.name}</p>
          <p className="text-white/60 text-xs">
            {new Date(status.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {status.privacy === 'everyone' ? '🌐' : status.privacy === 'contacts' ? '👥' : '🔒'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMuted(m => !m)} className="p-2 text-white/70 hover:text-white">
            {muted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
          </button>
          {isOwn && (
            <button onClick={handleDelete} className="p-2 text-white/70 hover:text-red-400">
              <FiTrash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Media */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status._id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full flex items-center justify-center"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {status.mediaType === 'image' ? (
            <img
              src={status.mediaUrl}
              alt=""
              className="max-h-full max-w-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={status.mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted={muted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Caption */}
      {status.caption && (
        <div className="absolute bottom-20 left-0 right-0 z-20 px-6">
          <p className="text-white text-sm text-center drop-shadow-lg bg-black/40 rounded-xl px-4 py-2">
            {status.caption}
          </p>
        </div>
      )}

      {/* Viewers (own statuses) */}
      {isOwn && viewers !== null && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
          <button
            onClick={() => setShowViewers(v => !v)}
            className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-4 py-2 rounded-full transition-colors"
          >
            <FiEye size={13} />
            <span>{viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}</span>
          </button>
        </div>
      )}

      {/* Viewer list panel */}
      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-chat-panel rounded-t-2xl max-h-72 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-chat-border">
              <span className="text-chat-text font-medium text-sm flex items-center gap-2">
                <FiEye size={15} className="text-primary-500" />
                Viewed by {viewers.length}
              </span>
              <button onClick={() => setShowViewers(false)} className="icon-btn p-1"><FiX size={16} /></button>
            </div>
            <div className="overflow-y-auto">
              {viewers.length === 0 ? (
                <p className="text-chat-textSecondary text-sm text-center py-8">No views yet</p>
              ) : (
                viewers.map(v => (
                  <div key={v._id} className="flex items-center gap-3 px-4 py-2.5">
                    <img
                      src={v.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.user?.name || 'U')}&background=2A3942&color=25D366`}
                      alt={v.user?.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-chat-text text-sm">{v.user?.name}</p>
                      <p className="text-chat-textSecondary text-xs">
                        {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left / Right tap zones */}
      <button
        onClick={goPrev}
        className="absolute left-0 top-0 w-1/4 h-full z-10 focus:outline-none"
      />
      <button
        onClick={goNext}
        className="absolute right-0 top-0 w-1/4 h-full z-10 focus:outline-none"
      />

      {/* Prev / Next group arrows */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx(i => i - 1); setStatusIdx(0); setProgress(0) }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          <FiChevronLeft size={20} />
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={() => { setGroupIdx(i => i + 1); setStatusIdx(0); setProgress(0) }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          <FiChevronRight size={20} />
        </button>
      )}
    </motion.div>
  )
}
