import React, { useState, useCallback } from 'react'
import { FiArrowLeft, FiSearch } from 'react-icons/fi'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import { getSocket } from '../../socket/socket'
import toast from 'react-hot-toast'

export default function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const { addChat, setActiveChat, fetchMessages, setSidePanel } = useChatStore()

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.users)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    const timer = setTimeout(() => search(q), 300)
    return () => clearTimeout(timer)
  }

  const startChat = async (targetUser) => {
    try {
      const { data } = await api.post('/chats', { participantId: targetUser._id })
      addChat(data.chat)
      setActiveChat(data.chat)
      await fetchMessages(data.chat._id, 1)

      const socket = getSocket()
      if (socket) {
        socket.emit('chat:join', data.chat._id)
        socket.emit('chat:new', data.chat)
      }

      setSidePanel(null)
    } catch (err) {
      toast.error('Failed to start chat')
    }
  }

  return (
    <div className="flex flex-col h-full bg-chat-sidebar">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-header">
        <button onClick={onClose} className="icon-btn">
          <FiArrowLeft size={20} />
        </button>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary text-sm" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search by name or email"
            className="w-full bg-chat-input text-chat-text placeholder-chat-textSecondary text-sm rounded-full py-2 pl-9 pr-4 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <p className="text-center text-chat-textSecondary text-sm py-8">No users found</p>
        )}

        {results.map(u => (
          <button
            key={u._id}
            onClick={() => startChat(u)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-chat-hover transition-colors text-left"
          >
            <div className="relative">
              <img
                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2A3942&color=25D366`}
                alt={u.name}
                className="avatar w-12 h-12"
              />
              {u.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-500 rounded-full border-2 border-chat-sidebar" />
              )}
            </div>
            <div>
              <p className="text-chat-text font-medium text-sm">{u.name}</p>
              <p className="text-chat-textSecondary text-xs">{u.bio || u.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
