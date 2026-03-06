import React, { useState, useCallback } from 'react'
import { FiArrowLeft, FiSearch, FiCamera, FiCheck } from 'react-icons/fi'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import { getSocket } from '../../socket/socket'
import toast from 'react-hot-toast'

export function NewChatPanel({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { addChat, setActiveChat, fetchMessages, setSidePanel } = useChatStore()

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.users)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    setTimeout(() => search(q), 300)
  }

  const startChat = async (u) => {
    try {
      const { data } = await api.post('/chats', { participantId: u._id })
      addChat(data.chat)
      setActiveChat(data.chat)
      await fetchMessages(data.chat._id, 1)
      const socket = getSocket()
      if (socket) { socket.emit('chat:join', data.chat._id); socket.emit('chat:new', data.chat) }
      setSidePanel(null)
    } catch { toast.error('Failed to start chat') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-header">
        <button onClick={onClose} className="icon-btn"><FiArrowLeft size={20} /></button>
        <h2 className="text-chat-text font-semibold">New Chat</h2>
      </div>
      <div className="px-3 py-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary text-sm" />
          <input autoFocus type="text" value={query} onChange={handleChange} placeholder="Search users..." className="w-full bg-chat-input text-chat-text placeholder-chat-textSecondary text-sm rounded-full py-2 pl-9 pr-4 outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}
        {results.map(u => (
          <button key={u._id} onClick={() => startChat(u)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-chat-hover transition-colors text-left">
            <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2A3942&color=25D366`} alt={u.name} className="avatar w-12 h-12" />
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

export function NewGroupPanel({ onClose }) {
  const [step, setStep] = useState(1) // 1: select members, 2: group info
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const { addChat, setActiveChat, fetchMessages, setSidePanel } = useChatStore()

  const search = async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.users)
    } catch {}
  }

  const toggleSelect = (u) => {
    setSelected(prev => prev.find(s => s._id === u._id) ? prev.filter(s => s._id !== u._id) : [...prev, u])
  }

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error('Enter a group name')
    setLoading(true)
    try {
      const { data } = await api.post('/chats/group', { name: groupName, participants: selected.map(u => u._id) })
      addChat(data.chat)
      setActiveChat(data.chat)
      await fetchMessages(data.chat._id, 1)
      const socket = getSocket()
      if (socket) { socket.emit('chat:join', data.chat._id); socket.emit('chat:new', data.chat) }
      setSidePanel(null)
      toast.success('Group created!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group')
    }
    setLoading(false)
  }

  if (step === 2) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-header">
        <button onClick={() => setStep(1)} className="icon-btn"><FiArrowLeft size={20} /></button>
        <h2 className="text-chat-text font-semibold">New Group</h2>
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-chat-input flex items-center justify-center cursor-pointer hover:bg-chat-hover transition-colors">
            <FiCamera size={32} className="text-chat-textSecondary" />
          </div>
        </div>
        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" className="input-field" autoFocus />
        <div>
          <p className="text-chat-textSecondary text-xs mb-2">Members ({selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(u => (
              <span key={u._id} className="flex items-center gap-1 bg-chat-input rounded-full px-3 py-1 text-sm text-chat-text">
                {u.name}
                <button onClick={() => toggleSelect(u)} className="text-chat-textSecondary hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4">
        <button onClick={createGroup} disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-header">
        <button onClick={onClose} className="icon-btn"><FiArrowLeft size={20} /></button>
        <h2 className="text-chat-text font-semibold">Add Members</h2>
        {selected.length > 0 && (
          <button onClick={() => setStep(2)} className="ml-auto btn-primary py-1.5 px-4 text-sm">Next</button>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex gap-2 px-3 py-2 flex-wrap border-b border-chat-border">
          {selected.map(u => (
            <span key={u._id} className="flex items-center gap-1 bg-chat-input rounded-full px-2 py-1 text-xs text-chat-text">
              {u.name} <button onClick={() => toggleSelect(u)} className="text-chat-textSecondary">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="px-3 py-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary text-sm" />
          <input autoFocus type="text" value={query} onChange={e => { setQuery(e.target.value); setTimeout(() => search(e.target.value), 300) }} placeholder="Search users..." className="w-full bg-chat-input text-chat-text placeholder-chat-textSecondary text-sm rounded-full py-2 pl-9 pr-4 outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {results.map(u => {
          const isSelected = !!selected.find(s => s._id === u._id)
          return (
            <button key={u._id} onClick={() => toggleSelect(u)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-chat-hover transition-colors text-left">
              <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2A3942&color=25D366`} alt={u.name} className="avatar w-12 h-12" />
              <div className="flex-1">
                <p className="text-chat-text font-medium text-sm">{u.name}</p>
                <p className="text-chat-textSecondary text-xs">{u.bio || u.email}</p>
              </div>
              {isSelected && <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"><FiCheck size={14} className="text-white" /></div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NewChatPanel
