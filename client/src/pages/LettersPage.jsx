import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

export default function LettersPage() {
  const { user } = useAuthStore();
  const [letters, setLetters] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [openedLetter, setOpenedLetter] = useState(null);
  const [tab, setTab] = useState('inbox');

  useEffect(() => { loadLetters(); }, []);

  const loadLetters = async () => {
    try {
      const [l, d] = await Promise.all([api.get('/letters'), api.get('/letters/drafts')]);
      setLetters(l.data.letters);
      setDrafts(d.data.drafts);
    } catch (_) {} finally { setLoading(false); }
  };

  const handleOpenLetter = async (letter) => {
    if (!letter.isOpened && letter.recipientId === user?._id) {
      try { await api.patch(`/letters/${letter._id}/open`); } catch (_) {}
    }
    setOpenedLetter(letter);
  };

  const inbox = letters.filter(l => l.recipientId === user?._id || l.authorId?._id !== user?._id);
  const sent = letters.filter(l => l.authorId?._id === user?._id);
  const currentList = tab === 'inbox' ? inbox : tab === 'sent' ? sent : drafts;

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="px-4 pt-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold text-pink-500">💌 Letters</h1>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setComposing(true)}
            className="px-4 py-2 rounded-full text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>
            Write ✍️
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-pink-50 dark:bg-rose-mid p-1 rounded-xl mb-4">
          {[['inbox', '📥 Inbox'], ['sent', '📤 Sent'], ['drafts', '📝 Drafts']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${tab === key ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Letters list */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          ) : currentList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💌</div>
              <p className="text-gray-400 text-sm">No letters yet</p>
            </div>
          ) : currentList.map((letter) => (
            <LetterCard key={letter._id} letter={letter} userId={user?._id} onOpen={handleOpenLetter} />
          ))}
        </div>
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {composing && <ComposeLetter onClose={() => setComposing(false)} onSent={() => { setComposing(false); loadLetters(); }} />}
      </AnimatePresence>

      {/* Open letter modal */}
      <AnimatePresence>
        {openedLetter && <OpenedLetter letter={openedLetter} onClose={() => setOpenedLetter(null)} />}
      </AnimatePresence>
    </div>
  );
}

const LetterCard = ({ letter, userId, onOpen }) => {
  const isMine = letter.authorId?._id === userId;
  const isUnread = !letter.isOpened && !isMine;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(letter)}
      className={`glass-card p-4 cursor-pointer flex items-center gap-3 ${isUnread ? 'ring-1 ring-pink-300' : ''}`}
    >
      <div className="text-3xl flex-shrink-0">{isUnread ? '💌' : letter.isDraft ? '📝' : '📖'}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 dark:text-pink-100 truncate">{letter.title}</div>
        <div className="text-xs text-gray-400 mt-0.5 truncate">{letter.content?.substring(0, 60)}...</div>
        <div className="text-[10px] text-pink-300 mt-1">
          {isMine ? 'To your love' : `From ${letter.authorId?.username || 'Your love'}`} · {new Date(letter.createdAt).toLocaleDateString()}
        </div>
      </div>
      {isUnread && <div className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />}
    </motion.div>
  );
};

const ComposeLetter = ({ onClose, onSent }) => {
  const [form, setForm] = useState({ title: '', content: '', isDraft: false, scheduledAt: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (isDraft) => {
    setSaving(true);
    try {
      await api.post('/letters', { ...form, isDraft });
      onSent();
    } catch (_) {} finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-rose-dark w-full max-w-md rounded-3xl flex flex-col h-[85vh]"
      >
        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="font-display text-lg font-semibold text-pink-500">✍️ Write a Letter</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3">
          <input placeholder="Letter title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400" />
          <textarea placeholder="Write from your heart... 💕" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            rows={8} className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 resize-none" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Schedule for (optional)</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none" />
          </div>
        </div>

        {/* Fixed footer — buttons always visible */}
        <div className="sticky bottom-0 px-6 pt-3 pb-6 flex gap-3 bg-white dark:bg-rose-dark border-t border-pink-100">
          <button onClick={() => handleSubmit(true)} disabled={saving}
            className="flex-1 py-3 rounded-xl border border-pink-300 text-pink-500 text-sm font-medium active:scale-95 transition-transform">
            Save Draft
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving || !form.content}
            className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>
            Send 💌
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const OpenedLetter = ({ letter, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <motion.div
      initial={{ scale: 0.8, rotateX: -20, opacity: 0 }}
      animate={{ scale: 1, rotateX: 0, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="bg-gradient-to-b from-white to-pink-50 dark:from-rose-dark dark:to-rose-mid w-full max-w-sm rounded-3xl shadow-2xl flex flex-col"
      style={{ maxHeight: '85vh' }}
    >
      <div className="text-center pt-6 px-6 flex-shrink-0">
        <div className="text-4xl mb-2">💌</div>
        <h2 className="font-display text-lg text-pink-500 font-semibold">{letter.title}</h2>
        <div className="text-xs text-gray-400 mt-1">
          From {letter.authorId?.username || 'Your Love'} · {new Date(letter.createdAt).toLocaleDateString()}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 border-t border-pink-100 mt-4 text-sm text-gray-700 dark:text-pink-100 leading-relaxed whitespace-pre-wrap">
        {letter.content}
      </div>
      <div className="px-6 pb-6 pt-3 flex-shrink-0">
        <button onClick={onClose}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>
          Close 💕
        </button>
      </div>
    </motion.div>
  </motion.div>
);
