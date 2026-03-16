import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';

// Tenor GIF search component
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('love');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    setLoading(true);
    try {
      // Use Tenor API - falls back to curated list
      const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${q}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk&limit=20&media_filter=gif`);
      const data = await res.json();
      setGifs(data.results?.map(r => ({ url: r.media_formats?.gif?.url, preview: r.media_formats?.tinygif?.url })) || []);
    } catch (_) {
      // Fallback curated GIFs
      setGifs([
        { url: 'https://media.tenor.com/UHRYeWcuCdkAAAAC/love-heart.gif', preview: 'https://media.tenor.com/UHRYeWcuCdkAAAAC/love-heart.gif' },
        { url: 'https://media.tenor.com/hfPJtpSIjXgAAAAC/love-cute.gif', preview: 'https://media.tenor.com/hfPJtpSIjXgAAAAC/love-cute.gif' },
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { search(query); }, []);

  return (
    <div className="border-b border-pink-100 bg-white dark:bg-rose-dark p-3">
      <div className="flex items-center gap-2 mb-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="Search GIFs... 🔍"
          className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-pink-200 outline-none" />
        <button onClick={() => search(query)} className="px-3 py-1.5 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Go</button>
        <button onClick={onClose} className="text-gray-400 text-xl">×</button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
        {loading ? <div className="col-span-3 text-center py-4 text-pink-400 text-sm">Loading...</div> :
          gifs.map((gif, i) => (
            <button key={i} onClick={() => onSelect(gif.url)} className="rounded-lg overflow-hidden aspect-square bg-pink-50">
              <img src={gif.preview || gif.url} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
      </div>
    </div>
  );
}

export default function MessageInput() {
  const [text, setText] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [surpriseTime, setSurpriseTime] = useState('');
  const [showSong, setShowSong] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const recordTimer = useRef(null);
  const { sendMessage, chat, replyingTo, clearReplyingTo } = useChatStore();

  const emitTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (socket && chat?._id) socket.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId: chat._id });
  }, [chat?._id]);

  useEffect(() => { if (replyingTo) inputRef.current?.focus(); }, [replyingTo]);

  const handleChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
    emitTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1500);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;
    if (imagePreview) { await sendImageFile(imagePreview.dataUrl, trimmed); return; }
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    emitTyping(false);
    await sendMessage(trimmed, 'text');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape' && replyingTo) clearReplyingTo();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview({ dataUrl: ev.target.result, file });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendImageFile = async (dataUrl, caption = '') => {
    setUploading(true);
    try {
      const { data } = await api.post('/upload', { data: dataUrl, type: 'image' });
      await sendMessage(caption, 'image', { mediaUrl: data.url });
      setImagePreview(null); setText('');
    } catch (_) {} finally { setUploading(false); }
  };

  // GIF send
  const handleSendGif = async (gifUrl) => {
    setShowGif(false);
    await sendMessage('', 'gif', { gifUrl });
  };

  // File upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const { data } = await api.post('/upload', { data: ev.target.result, type: 'file' });
        await sendMessage(file.name, 'file', {
          mediaUrl: data.url, fileName: file.name,
          fileSize: file.size, fileMime: file.type,
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (_) { setUploading(false); }
    e.target.value = '';
  };

  // Location share
  const handleShareLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      await sendMessage('📍 My location', 'location', { location: { lat, lng, isLive: false } });
    }, () => alert('Could not get location'));
    setShowExtras(false);
  };

  // Voice note recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = (e) => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (ev) => {
          setUploading(true);
          try {
            const { data } = await api.post('/upload', { data: ev.target.result, type: 'audio' });
            await sendMessage('🎤 Voice note', 'voice_note', { mediaUrl: data.url });
          } catch (_) {} finally { setUploading(false); }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (_) { alert('Microphone permission denied'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(recordTimer.current);
  };

  // Hug button
  const sendHug = () => {
    sendMessage('🤗 Sending you a hug!', 'hug');
    const socket = getSocket();
    if (socket && chat) socket.emit('send:hug', { chatId: chat._id, partnerId: chat.participants?.find(p => p !== chat._myId) });
    setShowExtras(false);
  };

  const handleGoodMorning = () => { sendMessage('Good Morning ☀️ Hope your day is as beautiful as you are! 🌸', 'good_morning'); setShowExtras(false); };
  const handleGoodNight = () => { sendMessage('Good Night 🌙 Sweet dreams my love 💕', 'good_night'); setShowExtras(false); };
  const handleMissYou = () => { sendMessage('I miss you so much 💕', 'miss_you'); setShowExtras(false); };
  const handleSendSong = () => {
    if (!songUrl) return;
    sendMessage(songTitle || 'Listen to this 🎵', 'song', { songData: { url: songUrl, title: songTitle || songUrl } });
    setSongUrl(''); setSongTitle(''); setShowSong(false);
  };
  const handleSendSurprise = () => {
    if (!text.trim() && !surpriseTime) return;
    sendMessage(text.trim() || 'A surprise for you 🎁', 'surprise', {
      unlockAt: surpriseTime ? new Date(surpriseTime).toISOString() : undefined, isUnlocked: false,
    });
    setText(''); setSurpriseTime(''); setShowSurprise(false);
  };

  const fileInputRef = useRef(null);

  return (
    <div className="bg-white dark:bg-rose-dark border-t border-pink-100 dark:border-pink-900/30 flex-shrink-0">
      {/* Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100">
            <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-rose-mid">
              <div className="w-0.5 h-8 rounded-full bg-pink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-pink-500 mb-0.5">Replying to {replyingTo.senderId?.username || 'message'}</div>
                <div className="text-xs text-gray-500 truncate">{replyingTo.type === 'image' ? '📷 Photo' : (replyingTo.content || 'Message')}</div>
              </div>
              <button onClick={clearReplyingTo} className="text-gray-400 text-lg">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIF Picker */}
      <AnimatePresence>
        {showGif && <GifPicker onSelect={handleSendGif} onClose={() => setShowGif(false)} />}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100">
            <div className="px-4 py-3 bg-pink-50 dark:bg-rose-mid">
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <img src={imagePreview.dataUrl} className="w-20 h-20 rounded-xl object-cover border-2 border-pink-200" />
                  <button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center">×</button>
                </div>
                <div className="flex-1">
                  <input placeholder="Add a caption..." value={text} onChange={e => setText(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark"
                    onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  <button onClick={handleSend} disabled={uploading}
                    className="mt-2 w-full py-2 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                    {uploading ? '⏳ Uploading...' : 'Send Photo 📷'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <AnimatePresence>
        {showExtras && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100">
            <div className="flex gap-2 flex-wrap p-3 bg-pink-50 dark:bg-rose-mid">
              {[
                { label: 'Good Morning ☀️', action: handleGoodMorning },
                { label: 'Good Night 🌙', action: handleGoodNight },
                { label: 'Miss You 💕', action: handleMissYou },
                { label: '🤗 Hug', action: sendHug },
                { label: '📍 Location', action: handleShareLocation },
                { label: 'Share Song 🎵', action: () => { setShowSong(true); setShowExtras(false); } },
                { label: 'Surprise 🎁', action: () => { setShowSurprise(true); setShowExtras(false); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-rose-dark text-pink-500 border border-pink-200 active:scale-95 transition-transform whitespace-nowrap">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-pink-50 dark:bg-rose-mid space-y-2 border-b border-pink-100">
              <input placeholder="Song title 🎵" value={songTitle} onChange={e => setSongTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <input placeholder="Spotify or YouTube URL" value={songUrl} onChange={e => setSongUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <div className="flex gap-2">
                <button onClick={handleSendSong} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Send 🎵</button>
                <button onClick={() => setShowSong(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surprise input */}
      <AnimatePresence>
        {showSurprise && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-pink-50 dark:bg-rose-mid space-y-2 border-b border-pink-100">
              <p className="text-xs text-pink-500 font-medium">🎁 Schedule a surprise message</p>
              <textarea placeholder="Your surprise message..." value={text} onChange={e => setText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none resize-none bg-white dark:bg-rose-dark" rows={2} />
              <input type="datetime-local" value={surpriseTime} onChange={e => setSurpriseTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <div className="flex gap-2">
                <button onClick={handleSendSurprise} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Schedule 🎁</button>
                <button onClick={() => setShowSurprise(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice recording indicator */}
      {recording && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-100">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-600 font-medium flex-1">Recording... {recordSeconds}s</span>
          <button onClick={stopRecording} className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-medium">Stop & Send</button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowExtras(s => !s)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg">
          {showExtras ? '✕' : '✨'}
        </motion.button>

        {/* GIF button */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowGif(s => !s); setShowExtras(false); }}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-xs font-bold">
          GIF
        </motion.button>

        {/* Image upload */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => !imagePreview && fileRef.current?.click()} disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg disabled:opacity-40">
          {uploading ? '⏳' : '📷'}
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />

        {/* File upload */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg disabled:opacity-40">
          📎
        </motion.button>
        <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileSelect} />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea ref={inputRef} value={imagePreview ? '' : text} onChange={handleChange} onKeyDown={handleKeyDown}
            placeholder={imagePreview ? 'Add caption ↑' : replyingTo ? 'Write a reply... 💕' : 'Say something sweet... 💕'}
            disabled={!!imagePreview} rows={1}
            className="message-input resize-none py-2.5 leading-snug w-full disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '96px', overflowY: 'auto' }} />
        </div>

        {/* Voice note / send button */}
        {!text.trim() && !imagePreview ? (
          <motion.button whileTap={{ scale: 0.85 }}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
            onMouseDown={startRecording} onMouseUp={stopRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: recording ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
            🎤
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
            disabled={(!text.trim() && !imagePreview) || uploading}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </motion.button>
        )}
      </div>
    </div>
  );
}
