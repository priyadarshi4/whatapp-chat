import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiImage, FiVideo, FiType, FiGlobe, FiUsers, FiUserCheck, FiChevronDown, FiCheck } from 'react-icons/fi'
import { useStatusStore } from '../../store/statusStore'
import { useAuthStore } from '../../store/authStore'
import { getSocket } from '../../socket/socket'
import toast from 'react-hot-toast'

const PRIVACY_OPTIONS = [
  { value: 'everyone',  label: 'Everyone',          icon: FiGlobe,     desc: 'All your contacts' },
  { value: 'contacts',  label: 'My Contacts',        icon: FiUsers,     desc: 'People you chat with' },
  { value: 'selected',  label: 'Selected Contacts',  icon: FiUserCheck, desc: 'Choose who can see' },
]

export default function StatusUploader({ onClose }) {
  const { uploadStatus, isUploading, contacts, fetchContacts } = useStatusStore()
  const { user } = useAuthStore()

  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [mediaType, setMediaType]   = useState(null)
  const [caption, setCaption]       = useState('')
  const [privacy, setPrivacy]       = useState('everyone')
  const [selected, setSelected]     = useState([]) // selected viewer IDs
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const fileRef = useRef()

  useEffect(() => { fetchContacts() }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const isVideo = f.type.startsWith('video/')
    const isImage = f.type.startsWith('image/')
    if (!isVideo && !isImage) { toast.error('Images and videos only'); return }
    if (f.size > 64 * 1024 * 1024)  { toast.error('Max file size is 64 MB'); return }

    setFile(f)
    setMediaType(isVideo ? 'video' : 'image')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const toggleContact = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handlePost = async () => {
    if (!file) { toast.error('Pick an image or video first'); return }
    if (privacy === 'selected' && selected.length === 0) {
      toast.error('Select at least one contact'); return
    }
    try {
      const newStatus = await uploadStatus(file, caption, privacy, privacy === 'selected' ? selected : [])
      // Broadcast to online contacts via socket
      const socket = getSocket()
      if (socket && newStatus) socket.emit('status:new', newStatus)
      toast.success('Status posted!')
      onClose()
    } catch {
      toast.error('Failed to post status')
    }
  }

  const privacyLabel = PRIVACY_OPTIONS.find(o => o.value === privacy)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        className="bg-chat-panel rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-chat-border">
          <h2 className="text-chat-text font-semibold text-base">Add Status</h2>
          <button onClick={onClose} className="icon-btn"><FiX size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Media picker / preview */}
          {!preview ? (
            <button
              onClick={() => fileRef.current.click()}
              className="w-full h-52 rounded-xl border-2 border-dashed border-chat-border flex flex-col items-center justify-center gap-3 hover:border-primary-500 hover:bg-chat-hover transition-all"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-chat-input rounded-full flex items-center justify-center">
                  <FiImage size={22} className="text-primary-500" />
                </div>
                <div className="w-12 h-12 bg-chat-input rounded-full flex items-center justify-center">
                  <FiVideo size={22} className="text-primary-500" />
                </div>
              </div>
              <p className="text-chat-textSecondary text-sm">Tap to pick photo or video</p>
              <p className="text-chat-textSecondary text-xs opacity-60">Max 64 MB</p>
            </button>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: 220 }}>
              {mediaType === 'image' ? (
                <img src={preview} alt="preview" className="w-full h-full object-contain" />
              ) : (
                <video src={preview} controls className="w-full h-full object-contain" />
              )}
              <button
                onClick={() => { setFile(null); setPreview(null); setMediaType(null) }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white transition-colors"
              >
                <FiX size={16} />
              </button>
              <button
                onClick={() => fileRef.current.click()}
                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                Change
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

          {/* Caption */}
          <div className="flex items-center gap-2 bg-chat-input rounded-xl px-3 py-2">
            <FiType size={16} className="text-chat-textSecondary flex-shrink-0" />
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={200}
              placeholder="Add a caption…"
              className="flex-1 bg-transparent text-chat-text text-sm placeholder-chat-textSecondary outline-none"
            />
            {caption && <span className="text-xs text-chat-textSecondary">{caption.length}/200</span>}
          </div>

          {/* Privacy selector */}
          <div className="relative">
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="w-full flex items-center justify-between bg-chat-input rounded-xl px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2 text-chat-text">
                <privacyLabel.icon size={16} className="text-primary-500" />
                <span>{privacyLabel.label}</span>
                <span className="text-chat-textSecondary text-xs">— {privacyLabel.desc}</span>
              </div>
              <FiChevronDown size={16} className={`text-chat-textSecondary transition-transform ${showPrivacy ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showPrivacy && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1 left-0 right-0 bg-chat-panel border border-chat-border rounded-xl shadow-xl z-20 overflow-hidden"
                >
                  {PRIVACY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setPrivacy(opt.value); setShowPrivacy(false) }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-chat-hover text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <opt.icon size={16} className="text-primary-500" />
                        <div>
                          <p className="text-chat-text text-sm">{opt.label}</p>
                          <p className="text-chat-textSecondary text-xs">{opt.desc}</p>
                        </div>
                      </div>
                      {privacy === opt.value && <FiCheck size={14} className="text-primary-500" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contact picker for 'selected' privacy */}
          <AnimatePresence>
            {privacy === 'selected' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-chat-textSecondary text-xs mb-2">Who can see this status:</p>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-chat-input p-2">
                  {contacts.length === 0 && (
                    <p className="text-chat-textSecondary text-xs text-center py-3">No contacts found</p>
                  )}
                  {contacts.map(c => (
                    <button
                      key={c._id}
                      onClick={() => toggleContact(c._id)}
                      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-chat-hover transition-colors"
                    >
                      <img
                        src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=2A3942&color=25D366`}
                        alt={c.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="flex-1 text-chat-text text-sm text-left">{c.name}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected.includes(c._id) ? 'bg-primary-500 border-primary-500' : 'border-chat-border'
                      }`}>
                        {selected.includes(c._id) && <FiCheck size={10} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
                {selected.length > 0 && (
                  <p className="text-primary-500 text-xs mt-1">{selected.length} contact{selected.length > 1 ? 's' : ''} selected</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Post button */}
          <button
            onClick={handlePost}
            disabled={!file || isUploading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
            ) : (
              'Post Status'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
