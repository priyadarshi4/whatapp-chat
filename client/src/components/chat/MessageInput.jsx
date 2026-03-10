import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';

export default function MessageInput() {
  const [text, setText] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [surpriseTime, setSurpriseTime] = useState('');
  const [showSong, setShowSong] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  // FEATURE 2: Image preview before sending
  const [imagePreview, setImagePreview] = useState(null); // { dataUrl, file }
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileRef = useRef(null);
  const { sendMessage, chat, replyingTo, clearReplyingTo } = useChatStore();

  const emitTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (socket && chat?._id) {
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId: chat._id });
    }
  }, [chat?._id]);

  // Auto-focus when replying
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const handleChange = (e) => {
    setText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
    emitTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1500);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;

    // If there's an image preview pending, send it first
    if (imagePreview) {
      await sendImageFile(imagePreview.dataUrl, trimmed);
      return;
    }

    setText('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    emitTyping(false);
    await sendMessage(trimmed, 'text');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape' && replyingTo) clearReplyingTo();
  };

  // FEATURE 2: Image file selected → show preview
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview({ dataUrl: ev.target.result, file });
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // FEATURE 2: Upload and send the image
  const sendImageFile = async (dataUrl, caption = '') => {
    setUploading(true);
    try {
      const { data } = await api.post('/upload', { data: dataUrl, type: 'image' });
      await sendMessage(caption, 'image', { mediaUrl: data.url });
      setImagePreview(null);
      setText('');
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelImage = () => {
    setImagePreview(null);
  };

  const handleGoodMorning = () => { sendMessage('Goooodduuu Morningg ☀️ Hope your day is as beautiful as you are! 🌸', 'good_morning'); setShowExtras(false); };
  const handleGoodNight = () => { sendMessage('Goooodduuuu Nightuuuu 🌙 Sweet dreams my love 💕', 'good_night'); setShowExtras(false); };
  const handleMissYou = () => { sendMessage('I miss you so much 💕', 'miss_you'); setShowExtras(false); };

  const handleSendSong = () => {
    if (!songUrl) return;
    sendMessage(songTitle || 'Listen to this 🎵', 'song', { songData: { url: songUrl, title: songTitle || songUrl } });
    setSongUrl(''); setSongTitle(''); setShowSong(false);
  };

  const handleSendSurprise = () => {
    if (!text.trim() && !surpriseTime) return;
    sendMessage(text.trim() || 'A surprise for you 🎁', 'surprise', {
      unlockAt: surpriseTime ? new Date(surpriseTime).toISOString() : undefined,
      isUnlocked: false,
    });
    setText(''); setSurpriseTime(''); setShowSurprise(false);
  };

  return (
    <div className="bg-white dark:bg-rose-dark border-t border-pink-100 dark:border-pink-900/30 flex-shrink-0">
      {/* FEATURE 1: Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100 dark:border-pink-900/30"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-rose-mid">
              <div className="w-0.5 h-8 rounded-full bg-pink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-pink-500 mb-0.5">
                  Replying to {replyingTo.senderId?.username || 'message'}
                </div>
                <div className="text-xs text-gray-500 dark:text-pink-300 truncate">
                  {replyingTo.type === 'image' ? '📷 Photo' : (replyingTo.content || 'Message')}
                </div>
              </div>
              <button onClick={clearReplyingTo} className="text-gray-400 flex-shrink-0 text-lg leading-none">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEATURE 2: Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100"
          >
            <div className="px-4 py-3 bg-pink-50 dark:bg-rose-mid">
              <div className="text-xs text-pink-500 font-medium mb-2">📷 Image preview</div>
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <img src={imagePreview.dataUrl} alt="preview"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-pink-200" />
                  <button onClick={handleCancelImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
                <div className="flex-1">
                  <input
                    placeholder="Add a caption... (optional)"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark"
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button
                    onClick={handleSend}
                    disabled={uploading}
                    className="mt-2 w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40 20" />
                        </svg>
                        Uploading...
                      </span>
                    ) : 'Send Photo 📷'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions panel */}
      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100"
          >
            <div className="flex gap-2 flex-wrap p-3 bg-pink-50 dark:bg-rose-mid">
              {[
                { label: 'Good Morning ☀️', action: handleGoodMorning },
                { label: 'Good Night 🌙', action: handleGoodNight },
                { label: 'Miss You 💕', action: handleMissYou },
                { label: 'Share Song 🎵', action: () => { setShowSong(true); setShowExtras(false); } },
                { label: 'Surprise 🎁', action: () => { setShowSurprise(true); setShowExtras(false); } },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.action}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-rose-dark text-pink-500 border border-pink-200 dark:border-pink-800 active:scale-95 transition-transform whitespace-nowrap">
                  {btn.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song input */}
      <AnimatePresence>
        {showSong && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-3 bg-pink-50 dark:bg-rose-mid space-y-2 border-b border-pink-100">
              <input placeholder="Song title 🎵" value={songTitle} onChange={e => setSongTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <input placeholder="Spotify or YouTube URL" value={songUrl} onChange={e => setSongUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <div className="flex gap-2">
                <button onClick={handleSendSong} className="flex-1 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>Send 🎵</button>
                <button onClick={() => setShowSong(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surprise input */}
      <AnimatePresence>
        {showSurprise && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-3 bg-pink-50 dark:bg-rose-mid space-y-2 border-b border-pink-100">
              <p className="text-xs text-pink-500 font-medium">🎁 Schedule a surprise message</p>
              <textarea placeholder="Your surprise message..." value={text} onChange={e => setText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none resize-none bg-white dark:bg-rose-dark" rows={2} />
              <input type="datetime-local" value={surpriseTime} onChange={e => setSurpriseTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <div className="flex gap-2">
                <button onClick={handleSendSurprise} className="flex-1 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>Schedule 🎁</button>
                <button onClick={() => setShowSurprise(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        {/* Extras toggle */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowExtras(s => !s)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg transition-colors">
          {showExtras ? '✕' : '✨'}
        </motion.button>

        {/* Image upload */}
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => !imagePreview && fileRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg transition-colors disabled:opacity-40">
          {uploading ? (
            <svg className="animate-spin w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
            </svg>
          ) : '📷'}
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={imagePreview ? '' : text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={imagePreview ? 'Add a caption above ↑' : replyingTo ? 'Write a reply... 💕' : 'Say something sweet... 💕'}
            disabled={!!imagePreview}
            rows={1}
            className="message-input resize-none py-2.5 leading-snug w-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '40px', maxHeight: '96px', overflowY: 'auto' }}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSend}
          disabled={(!text.trim() && !imagePreview) || uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
