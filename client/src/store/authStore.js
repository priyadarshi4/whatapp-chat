import { create } from 'zustand';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  partner: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, loading: false });
      initSocket(token);
      // Load partner
      const p = await api.get('/users/partner');
      set({ partner: p.data.partner });
    } catch (_) {
      localStorage.removeItem('token');
      set({ token: null, user: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
    initSocket(data.token);
    const p = await api.get('/users/partner');
    set({ partner: p.data.partner });
    return data;
  },

  register: async (form) => {
    set({ error: null });
    const { data } = await api.post('/auth/register', form);
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
    initSocket(data.token);
    return data;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('token');
    disconnectSocket();
    set({ user: null, partner: null, token: null });
  },

  updateMood: async (mood) => {
    await api.patch('/users/mood', { mood });
    set((s) => ({ user: { ...s.user, mood } }));
  },

  setPartnerOnline: (isOnline, lastSeen) => {
    set((s) => ({ partner: s.partner ? { ...s.partner, isOnline, lastSeen } : s.partner }));
  },

  updateUser: (updates) => {
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : s.user }));
  },

  setPartnerMood: (mood) => {
    set((s) => ({ partner: s.partner ? { ...s.partner, mood } : s.partner }));
  },
}));

export default useAuthStore;

// Export setState for external use (profile page)
