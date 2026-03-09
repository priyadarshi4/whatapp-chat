import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'missing_you', label: 'Missing You', emoji: '🥺' },
  { value: 'thinking_of_you', label: 'Thinking of You', emoji: '💭' },
  { value: 'busy', label: 'Busy', emoji: '😤' },
  { value: 'in_love', label: 'In Love', emoji: '🥰' },
];

export default function LovePage() {
  const { user, partner, updateMood } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/couple/stats');
      setStats(data);
    } catch (_) {} finally { setLoading(false); }
  };

  const handleDateSave = async () => {
    if (!newDate) return;
    try {
      await api.patch('/couple/relationship-date', { date: newDate });
      setEditingDate(false);
      loadStats();
    } catch (_) {}
  };

  const loveScore = stats ? Math.min(100, Math.floor(
    (stats.daysTogether / 365 * 40) + (Math.min(stats.totalMessages, 10000) / 10000 * 40) + (stats.photoCount / 100 * 20)
  )) : 0;

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="text-center pt-2">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl mb-2">💕</motion.div>
        <h1 className="font-display text-2xl text-pink-500 font-bold">Our Love</h1>
        {stats && (
          <p className="text-sm text-gray-400 mt-1">Together for {stats.daysTogether} days ✨</p>
        )}
      </div>

      {/* Days counter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 text-center">
        {loading ? <div className="skeleton h-16 rounded-xl" /> : (
          <>
            <div className="font-display text-5xl font-bold text-pink-500">{stats?.daysTogether || 0}</div>
            <div className="text-sm text-gray-500 mt-1">days together ❤️</div>
            {stats?.relationshipStartDate && (
              <div className="text-xs text-pink-300 mt-1">
                Since {new Date(stats.relationshipStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            <button onClick={() => setEditingDate(true)}
              className="mt-3 text-xs text-pink-400 underline">Change date</button>
            {editingDate && (
              <div className="flex gap-2 mt-3 items-center">
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-sm outline-none" />
                <button onClick={handleDateSave} className="px-3 py-2 rounded-xl text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>Save</button>
                <button onClick={() => setEditingDate(false)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Love Meter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-5">
        <h3 className="font-semibold text-gray-700 dark:text-pink-100 mb-3 flex items-center gap-2">
          ❤️ Love Meter
        </h3>
        {loading ? <div className="skeleton h-8 rounded-xl" /> : (
          <>
            <div className="w-full bg-pink-100 dark:bg-rose-mid rounded-full h-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loveScore}%` }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full relative"
                style={{ background: 'linear-gradient(90deg, #FF4F8B, #FF8FB1, #CDB4DB)' }}
              >
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-white text-[10px] font-bold">{loveScore}%</div>
              </motion.div>
            </div>
            <div className="text-xs text-pink-400 text-right mt-1">
              {loveScore >= 80 ? '💕 Deeply in love' : loveScore >= 50 ? '❤️ Growing stronger' : '🌱 Just beginning'}
            </div>
          </>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3">
        {[
          { icon: '💬', label: 'Total Messages', value: stats?.totalMessages || 0 },
          { icon: '💬', label: 'Today', value: stats?.todayMessages || 0 },
          { icon: '📸', label: 'Photos Shared', value: stats?.photoCount || 0 },
          { icon: '💕', label: 'Miss You\'s', value: stats?.missYouCount || 0 },
        ].map(({ icon, label, value }) => (
          <div key={label} className="glass-card p-4 text-center">
            {loading ? <div className="skeleton h-12 rounded-xl" /> : (
              <>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-bold text-xl text-pink-500">{value.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </>
            )}
          </div>
        ))}
      </motion.div>

      {/* Mood selector */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card p-4">
        <h3 className="font-semibold text-gray-700 dark:text-pink-100 mb-3">💭 My Mood</h3>
        <div className="flex gap-2 flex-wrap">
          {MOODS.map((m) => (
            <motion.button
              key={m.value}
              whileTap={{ scale: 0.9 }}
              onClick={() => updateMood(m.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
                user?.mood === m.value
                  ? 'text-white shadow-glow-pink'
                  : 'bg-pink-50 dark:bg-rose-mid text-gray-600 dark:text-pink-200 border border-pink-100 dark:border-pink-900'
              }`}
              style={user?.mood === m.value ? { background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' } : {}}
            >
              <span>{m.emoji}</span>
              <span className="text-xs font-medium">{m.label}</span>
            </motion.button>
          ))}
        </div>
        {partner?.mood && (
          <div className="mt-3 text-xs text-gray-400">
            {partner.username} is feeling: {MOODS.find(m => m.value === partner.mood)?.emoji} {MOODS.find(m => m.value === partner.mood)?.label}
          </div>
        )}
      </motion.div>

      {/* Love wall */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card p-4">
        <h3 className="font-semibold text-gray-700 dark:text-pink-100 mb-3">🌸 Love Wall</h3>
        <div className="grid grid-cols-2 gap-2">
          {LOVE_QUOTES.map((q, i) => (
            <div key={i} className="p-3 rounded-xl text-xs text-center italic text-pink-500"
              style={{ background: `hsl(${340 + i * 15}, 80%, 97%)` }}>
              "{q}"
            </div>
          ))}
        </div>
      </motion.div>

      <div className="h-4" />
    </div>
  );
}

const LOVE_QUOTES = [
  "You are my today and all of my tomorrows.",
  "In a sea of people, my eyes will always search for you.",
  "I love you more than yesterday, less than tomorrow.",
  "You make my heart smile.",
];
