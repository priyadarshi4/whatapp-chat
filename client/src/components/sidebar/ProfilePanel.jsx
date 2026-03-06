import React, { useState, useRef } from 'react'
import { FiArrowLeft, FiCamera, FiEdit2, FiCheck, FiX } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function ProfilePanel({ onClose }) {
  const { user, updateUser } = useAuthStore()
  const [editName, setEditName] = useState(false)
  const [editBio, setEditBio] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const saveName = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', { name })
      updateUser(data.user)
      setEditName(false)
      toast.success('Name updated')
    } catch { toast.error('Failed to update name') }
    setLoading(false)
  }

  const saveBio = async () => {
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', { bio })
      updateUser(data.user)
      setEditBio(false)
      toast.success('Bio updated')
    } catch { toast.error('Failed to update bio') }
    setLoading(false)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser(data.user)
      toast.success('Avatar updated')
    } catch { toast.error('Failed to update avatar') }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full bg-chat-sidebar">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-header">
        <button onClick={onClose} className="icon-btn"><FiArrowLeft size={20} /></button>
        <h2 className="text-chat-text font-semibold">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center py-8 bg-chat-panel">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=25D366&color=fff&size=200`}
              alt={user?.name}
              className="w-32 h-32 rounded-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FiCamera className="text-white text-2xl" />
            </div>
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full"><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-chat-textSecondary text-xs mt-3">Tap to change photo</p>
        </div>

        {/* Name */}
        <div className="px-6 py-4 border-b border-chat-border">
          <p className="text-primary-500 text-xs mb-2 font-medium">Your Name</p>
          {editName ? (
            <div className="flex items-center gap-2">
              <input value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-transparent text-chat-text outline-none border-b border-primary-500 pb-1" autoFocus onKeyDown={e => e.key === 'Enter' && saveName()} />
              <button onClick={saveName} className="text-primary-500"><FiCheck size={18} /></button>
              <button onClick={() => { setEditName(false); setName(user?.name) }} className="text-chat-textSecondary"><FiX size={18} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-chat-text">{user?.name}</p>
              <button onClick={() => setEditName(true)} className="icon-btn"><FiEdit2 size={16} /></button>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="px-6 py-4 border-b border-chat-border">
          <p className="text-primary-500 text-xs mb-2 font-medium">About</p>
          {editBio ? (
            <div className="flex items-center gap-2">
              <textarea value={bio} onChange={e => setBio(e.target.value)} className="flex-1 bg-transparent text-chat-text outline-none border-b border-primary-500 pb-1 resize-none" rows={2} autoFocus />
              <div className="flex flex-col gap-1">
                <button onClick={saveBio} className="text-primary-500"><FiCheck size={18} /></button>
                <button onClick={() => { setEditBio(false); setBio(user?.bio) }} className="text-chat-textSecondary"><FiX size={18} /></button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-chat-text">{user?.bio || 'Hey there! I am using ChatApp.'}</p>
              <button onClick={() => setEditBio(true)} className="icon-btn"><FiEdit2 size={16} /></button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="px-6 py-4">
          <p className="text-primary-500 text-xs mb-2 font-medium">Email</p>
          <p className="text-chat-text">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}
