import React, { useState, useRef, useCallback, useEffect } from 'react'
import { FiSend, FiPaperclip, FiSmile, FiMic, FiX, FiSquare } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import EmojiPicker from 'emoji-picker-react'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { getSocket } from '../../socket/socket'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function MessageInput() {
  const { user } = useAuthStore()
  const { activeChat, addMessage } = useChatStore()
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaPreview, setMediaPreview] = useState(null) // {file, type, url}

  const inputRef = useRef()
  const fileRef = useRef()
  const mediaRecorderRef = useRef()
  const chunksRef = useRef([])
  const typingTimerRef = useRef()
  const recordingTimerRef = useRef()

  const socket = getSocket()

  const handleTyping = useCallback(() => {
    if (!activeChat) return
    socket?.emit('typing:start', { chatId: activeChat._id })
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { chatId: activeChat._id })
    }, 2000)
  }, [activeChat, socket])

  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current)
      clearInterval(recordingTimerRef.current)
    }
  }, [])

  const sendMessage = async (overrideText, messageType = 'text', mediaFile = null) => {
    const content = overrideText ?? text
    if (!content.trim() && !mediaFile) return
    if (!activeChat) return

    const tempId = Date.now().toString()
    setText('')
    setShowEmoji(false)
    setMediaPreview(null)
    socket?.emit('typing:stop', { chatId: activeChat._id })

    try {
      if (mediaFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', mediaFile)
        formData.append('chatId', activeChat._id)
        formData.append('messageType', messageType)
        if (content) formData.append('message', content)

        const { data } = await api.post('/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        addMessage(data.message)
        // Emit to socket so others get it
        socket?.emit('message:send', {
          chatId: activeChat._id,
          messageType,
          tempId,
          existingMessageId: data.message._id,
        })
        setIsUploading(false)
      } else {
        // Optimistic UI
        const optimisticMsg = {
          _id: tempId,
          chatId: activeChat._id,
          senderId: { _id: user._id, name: user.name, avatar: user.avatar },
          message: content,
          messageType: 'text',
          createdAt: new Date().toISOString(),
          seenBy: [],
          deliveredTo: [],
          reactions: [],
        }
        addMessage(optimisticMsg)

        socket?.emit('message:send', {
          chatId: activeChat._id,
          message: content,
          messageType: 'text',
          tempId,
        })
      }
    } catch (err) {
      toast.error('Failed to send message')
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const type = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio'
      : 'document'

    const url = URL.createObjectURL(file)
    setMediaPreview({ file, type, url, name: file.name })
    e.target.value = ''
  }

  const sendMedia = () => {
    if (!mediaPreview) return
    sendMessage(text, mediaPreview.type, mediaPreview.file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        setRecordingTime(0)
        clearInterval(recordingTimerRef.current)
        await sendMessage('', 'audio', file)
      }

      mediaRecorder.start()
      setIsRecording(true)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    setIsRecording(false)
    setRecordingTime(0)
    clearInterval(recordingTimerRef.current)
  }

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-chat-header border-t border-chat-border">
        <button onClick={cancelRecording} className="icon-btn text-red-400"><FiX size={20} /></button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-3 h-3 bg-red-500 rounded-full notification-pulse" />
          <div className="flex gap-0.5 items-center">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="waveform-bar w-0.5" style={{ height: `${Math.random() * 20 + 5}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-chat-textSecondary text-sm">{formatTime(recordingTime)}</span>
        </div>
        <button onClick={stopRecording} className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
          <FiSquare size={16} className="text-white" />
        </button>
      </div>
    )
  }

  // Media preview UI
  if (mediaPreview) {
    return (
      <div className="bg-chat-header border-t border-chat-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-chat-border">
          <button onClick={() => setMediaPreview(null)} className="icon-btn"><FiX size={20} /></button>
          <span className="text-chat-text text-sm font-medium">Send {mediaPreview.type}</span>
          <div />
        </div>
        <div className="flex items-center justify-center p-4">
          {mediaPreview.type === 'image' && (
            <img src={mediaPreview.url} alt="Preview" className="max-h-48 rounded-lg object-contain" />
          )}
          {mediaPreview.type === 'video' && (
            <video src={mediaPreview.url} className="max-h-48 rounded-lg" controls />
          )}
          {(mediaPreview.type === 'audio' || mediaPreview.type === 'document') && (
            <div className="flex items-center gap-3 p-4 bg-chat-input rounded-lg">
              <span className="text-3xl">{mediaPreview.type === 'audio' ? '🎵' : '📄'}</span>
              <p className="text-chat-text text-sm">{mediaPreview.name}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 pb-3">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a caption..."
            className="input-field text-sm"
          />
          <button
            onClick={sendMedia}
            disabled={isUploading}
            className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors flex-shrink-0"
          >
            {isUploading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <FiSend className="text-white" size={18} />
            }
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-chat-header border-t border-chat-border">
      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 z-50"
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              height={380}
              width={350}
              previewConfig={{ showPreview: false }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 px-4 py-3">
        {/* Emoji */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`icon-btn ${showEmoji ? 'text-primary-500' : ''}`}
        >
          <FiSmile size={22} />
        </button>

        {/* File attach */}
        <button onClick={() => fileRef.current?.click()} className="icon-btn">
          <FiPaperclip size={22} />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); handleTyping() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
          }}
          placeholder="Type a message"
          className="flex-1 bg-chat-input text-chat-text placeholder-chat-textSecondary rounded-full py-2.5 px-4 text-sm outline-none"
        />

        {/* Send / Mic */}
        {text.trim() ? (
          <button
            onClick={() => sendMessage()}
            className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors flex-shrink-0"
          >
            <FiSend className="text-white" size={18} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors flex-shrink-0"
          >
            <FiMic className="text-white" size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
