import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import api from '../utils/api';

export default function ProfilePage() {
  const { user, partner, logout, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [form, setForm] = useState({ username: user?.username || '', relationshipStartDate: '' });
  const [statusText, setStatusText] = useState(user?.statusText || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [offlineCount, setOfflineCount] = useState(0);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    // Fetch offline unread count
    api.get('/users/me').then(({ data }) => {
      setOfflineCount(data.user?.offlineUnreadCount || 0);
    }).catch(() => {});
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(d => !d);
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveStatus = async () => {
    try {
      const { data } = await api.patch('/users/profile', { statusText });
      updateUser(data.user);
      setEditingStatus(false);
    } catch (_) {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = undefined;
      if (avatarPreview) {
        setUploadingAvatar(true);
        const { data } = await api.post('/upload', { data: avatarPreview, type: 'image', folder: 'couple-chat/avatars' });
        avatarUrl = data.url;
        setUploadingAvatar(false);
      }
      const payload = { ...form, ...(avatarUrl && { avatar: avatarUrl }) };
      const { data } = await api.patch('/users/profile', payload);
      updateUser(data.user);
      setAvatarPreview(null);
      setEditing(false);
    } catch (_) {} finally { setSaving(false); }
  };

  const currentAvatar = avatarPreview || user?.avatar;

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="px-4 pt-4 pb-24 space-y-4 min-h-full">

        {/* Offline unread notification */}
        {offlineCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 flex items-center gap-3 border border-pink-200">
            <span className="text-2xl">💌</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-pink-600">You missed {offlineCount} message{offlineCount > 1 ? 's' : ''}!</p>
              <p className="text-xs text-gray-400">While you were offline</p>
            </div>
            <span className="w-7 h-7 rounded-full bg-pink-500 text-white text-sm flex items-center justify-center font-bold">{offlineCount}</span>
          </motion.div>
        )}

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
          <div className="relative inline-block mb-3">
            <div className={`w-20 h-20 rounded-full mx-auto overflow-hidden cursor-pointer relative ${user?.statusText ? 'ring-3 ring-pink-500 ring-offset-2' : ''}`}
              style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}
              onClick={() => avatarInputRef.current?.click()}>
              {currentAvatar
                ? <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">🪷</div>}
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <span className="text-white text-xl">📷</span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            {user?.isOnline && <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />}
          </div>

          <h2 className="font-display text-xl font-bold text-gray-800 dark:text-pink-100">{user?.username}</h2>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>

          {/* Status text */}
          {user?.statusText ? (
            <button onClick={() => setEditingStatus(true)} className="mt-2 text-sm text-gray-500 dark:text-pink-300 italic">
              "{user.statusText}" ✏️
            </button>
          ) : (
            <button onClick={() => setEditingStatus(true)} className="mt-2 text-xs text-pink-400 border border-pink-200 px-3 py-1 rounded-full">
              + Set Status
            </button>
          )}

          {user?.mood && <p className="text-sm text-pink-400 mt-1">Feeling {user.mood.replace(/_/g, ' ')} 💭</p>}

          <div className="flex gap-2 justify-center mt-3">
            <button onClick={() => setEditing(true)} className="px-4 py-1.5 rounded-full text-xs font-medium text-pink-500 border border-pink-200 active:scale-95 transition-transform">
              Edit Profile
            </button>
            <button onClick={() => avatarInputRef.current?.click()}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
              📷 Photo
            </button>
          </div>
        </motion.div>

        {/* Partner card */}
        {partner && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 rounded-full overflow-hidden ${partner.statusText ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
                style={{ background: 'linear-gradient(135deg,#FF8FB1,#CDB4DB)' }}>
                {partner.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">💕</div>}
              </div>
              {partner.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 dark:text-pink-100 truncate">{partner.username}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {partner.isOnline ? '✨ Online now' : `Last seen ${partner.lastSeen ? new Date(partner.lastSeen).toLocaleDateString() : 'recently'}`}
              </div>
              {partner.statusText && <div className="text-xs text-pink-400 mt-0.5 italic">"{partner.statusText}"</div>}
              {partner.mood && <div className="text-xs text-pink-400 mt-0.5">Feeling {partner.mood.replace(/_/g, ' ')}</div>}
            </div>
            <div className="text-pink-300 text-xl">💕</div>
          </motion.div>
        )}

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden divide-y divide-pink-100 dark:divide-pink-900/30">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🌙</span>
              <span className="text-sm font-medium text-gray-700 dark:text-pink-100">Dark Mode</span>
            </div>
            <button onClick={toggleDark} className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${darkMode ? 'bg-pink-500' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="p-4 flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div><div className="text-sm font-medium text-gray-700 dark:text-pink-100">Private App</div><div className="text-xs text-gray-400">Only you two can access</div></div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <span className="text-xl">💕</span>
            <div><div className="text-sm font-medium text-gray-700 dark:text-pink-100">Couple App</div><div className="text-xs text-gray-400">Built with love for two</div></div>
          </div>
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }} onClick={logout}
          className="w-full py-3 rounded-xl border border-pink-200 text-pink-500 font-medium text-sm">
          Sign Out
        </motion.button>
      </div>

      {/* Status edit sheet */}
      <AnimatePresence>
        {editingStatus && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end pb-2">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white dark:bg-rose-dark w-full rounded-t-3xl p-6 max-h-[65vh] overflow-y-auto pb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-pink-500 font-semibold">Set Status 💬</h2>
                <button onClick={() => setEditingStatus(false)} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Hello Baby Ky soch rhe ho.....</p>
              <input value={statusText} onChange={e => setStatusText(e.target.value)}
                placeholder="Available, Busy, In love... 💕" maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 mb-2" />
              {/* Quick status options */}
              <div className="flex gap-2 flex-wrap mb-4">
                {['Available ✅','Busy 😅','Missing you 🥺','In love 🥰','At work 💼','Do not disturb 🔕'].map(s => (
                  <button key={s} onClick={() => setStatusText(s)}
                    className="px-3 py-1 rounded-full text-xs bg-pink-50 text-pink-500 border border-pink-200 active:scale-95 transition-transform">
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStatusText(''); handleSaveStatus(); }} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm">Clear</button>
                <button onClick={handleSaveStatus} className="flex-1 py-3 rounded-xl text-white font-medium"
                  style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                  Save Status 💕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit profile sheet */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white dark:bg-rose-dark w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                <h2 className="font-display text-lg text-pink-500 font-semibold">Edit Profile ✍️</h2>
                <button onClick={() => { setEditing(false); setAvatarPreview(null); }} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
                <div className="flex justify-center">
                  <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <div className="w-20 h-20 rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg,#FF4F8B,#CDB4DB)' }}>
                      {(avatarPreview || user?.avatar) ? <img src={avatarPreview || user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🪷</div>}
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                      <span className="text-white">📷</span>
                    </div>
                  </div>
                </div>
                {avatarPreview && <p className="text-center text-xs text-pink-400">New photo selected ✓</p>}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Together since</label>
                  <input type="date" value={form.relationshipStartDate} onChange={e => setForm({ ...form, relationshipStartDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none" />
                </div>
              </div>
              <div className="px-6 pt-3 pb-6 flex-shrink-0 bg-white dark:bg-rose-dark border-t border-pink-100">
                <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                  {saving ? (uploadingAvatar ? 'Uploading photo...' : 'Saving...') : 'Save Changes 💕'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
