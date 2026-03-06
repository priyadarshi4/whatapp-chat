import { create } from 'zustand'
import api from '../utils/api'

export const useStatusStore = create((set, get) => ({
  statusGroups: [],   // [{ user, statuses[], hasUnread }]
  myStatuses: [],
  contacts: [],
  isLoading: false,
  isUploading: false,

  fetchFeed: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/status')
      set({ statusGroups: data.statusGroups, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchMyStatuses: async () => {
    try {
      const { data } = await api.get('/status/my')
      set({ myStatuses: data.statuses })
    } catch {}
  },

  fetchContacts: async () => {
    try {
      const { data } = await api.get('/status/contacts')
      set({ contacts: data.contacts })
    } catch {}
  },

  uploadStatus: async (file, caption, privacy, allowedViewers) => {
    set({ isUploading: true })
    try {
      const form = new FormData()
      form.append('media', file)
      form.append('caption', caption)
      form.append('privacy', privacy)
      if (allowedViewers?.length) form.append('allowedViewers', JSON.stringify(allowedViewers))

      const { data } = await api.post('/status', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set({ isUploading: false })
      await get().fetchFeed()
      return data.status
    } catch (err) {
      set({ isUploading: false })
      throw err
    }
  },

  markViewed: async (statusId) => {
    try {
      await api.post(`/status/${statusId}/view`)
      // Update local state: mark as viewed
      set(state => ({
        statusGroups: state.statusGroups.map(g => ({
          ...g,
          statuses: g.statuses.map(s =>
            s._id === statusId ? { ...s, hasViewed: true } : s
          ),
          hasUnread: g.statuses.some(s => s._id !== statusId && !s.hasViewed),
        }))
      }))
    } catch {}
  },

  deleteStatus: async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`)
      set(state => ({
        myStatuses: state.myStatuses.filter(s => s._id !== statusId),
        statusGroups: state.statusGroups.map(g => ({
          ...g,
          statuses: g.statuses.filter(s => s._id !== statusId),
        })).filter(g => g.statuses.length > 0),
      }))
    } catch {}
  },

  // Called from socket when someone posts a new status
  addStatusFromSocket: (status) => {
    set(state => {
      const uid = status.userId._id || status.userId
      const existing = state.statusGroups.find(g => g.user._id?.toString() === uid?.toString())
      if (existing) {
        return {
          statusGroups: state.statusGroups.map(g =>
            g.user._id?.toString() === uid?.toString()
              ? { ...g, statuses: [{ ...status, hasViewed: false }, ...g.statuses], hasUnread: true }
              : g
          )
        }
      }
      return {
        statusGroups: [
          ...state.statusGroups,
          { user: status.userId, statuses: [{ ...status, hasViewed: false }], hasUnread: true }
        ]
      }
    })
  },
}))
