import { create } from 'zustand'
import api from '../utils/api'
import { initSocket, disconnectSocket } from '../socket/socket'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('chatapp_user') || 'null'),
  token: localStorage.getItem('chatapp_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('chatapp_token', data.token)
      localStorage.setItem('chatapp_user', JSON.stringify(data.user))
      initSocket(data.token)
      set({ user: data.user, token: data.token, isLoading: false })
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed'
      set({ isLoading: false, error })
      return { success: false, error }
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      localStorage.setItem('chatapp_token', data.token)
      localStorage.setItem('chatapp_user', JSON.stringify(data.user))
      initSocket(data.token)
      set({ user: data.user, token: data.token, isLoading: false })
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Registration failed'
      set({ isLoading: false, error })
      return { success: false, error }
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // ignore
    }
    disconnectSocket()
    localStorage.removeItem('chatapp_token')
    localStorage.removeItem('chatapp_user')
    set({ user: null, token: null })
  },

  updateUser: (updates) => {
    const user = { ...get().user, ...updates }
    localStorage.setItem('chatapp_user', JSON.stringify(user))
    set({ user })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      const user = data.user
      localStorage.setItem('chatapp_user', JSON.stringify(user))
      set({ user })
    } catch (err) {
      // token may be expired
    }
  },

  clearError: () => set({ error: null }),
}))
