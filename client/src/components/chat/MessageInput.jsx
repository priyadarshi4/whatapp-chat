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
  const [imagePreview, setImagePreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingReady, setRecordingReady] = useState(false); // blob ready to send

  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileRef = useRef(null);
  const fileAnyRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordBlobRef = useRef(null);
  const recordTimer = useRef(null);

  const { sendMessage, chat, replyingTo, clearReplyingTo } = useChatStore();

  const emitTyping = useCallback((typing) => {
    const socket = getSocket();
    if (socket && chat?._id) socket.emit(typing ? 'typing:start' : 'typing:stop', { chatId: chat._id });
  }, [chat?._id]);

  useEffect(() => { if (replyingTo) inputRef.current?.focus(); }, [replyingTo]);

  // ── Handle keyboard GIF / sticker paste ──
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = async (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/') || item.type === 'image/gif') {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = ev => setImagePreview({ dataUrl: ev.target.result, file, isGif: item.type === 'image/gif' });
          reader.readAsDataURL(file);
          return;
        }
      }
    };
    el.addEventListener('paste', handler);
    return () => el.removeEventListener('paste', handler);
  }, []);

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
    if (imagePreview) { await sendMediaFile(imagePreview); return; }
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
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview({ dataUrl: ev.target.result, file });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const { data } = await api.post('/upload', { data: ev.target.result, type: 'file' });
          await sendMessage(file.name, 'file', { mediaUrl: data.url, fileName: file.name, fileSize: file.size, fileMime: file.type });
        } catch (_) {} finally { setUploading(false); }
      };
      reader.readAsDataURL(file);
    } catch (_) { setUploading(false); }
    e.target.value = '';
  };

  const sendMediaFile = async (preview) => {
    setUploading(true);
    try {
      const isGif = preview.isGif || preview.file?.type === 'image/gif' || preview.file?.name?.endsWith('.gif');
      const { data } = await api.post('/upload', { data: preview.dataUrl, type: 'image' });
      if (isGif) {
        await sendMessage('', 'gif', { gifUrl: data.url });
      } else {
        await sendMessage(text.trim(), 'image', { mediaUrl: data.url });
      }
      setImagePreview(null); setText('');
    } catch (_) {} finally { setUploading(false); }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      await sendMessage('📍 My location', 'location', { location: { lat: pos.coords.latitude, lng: pos.coords.longitude, isLive: false } });
    });
    setShowExtras(false);
  };

  // ── Voice note: tap-to-start / tap-to-stop (works on mobile) ──
  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      recordBlobRef.current = null;

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        recordBlobRef.current = blob;
        stream.getTracks().forEach(t => t.stop());
        setRecordingReady(true);
        setRecording(false);
        clearInterval(recordTimer.current);
      };

      mr.start(100); // collect data every 100ms
      setRecording(true);
      setRecordingReady(false);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (_) { alert('Microphone permission required for voice notes'); }
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const sendVoiceNote = async () => {
    if (!recordBlobRef.current) return;
    setUploading(true);
    setRecordingReady(false);
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const { data } = await api.post('/upload', { data: ev.target.result, type: 'audio' });
          await sendMessage('🎤 Voice note', 'voice_note', { mediaUrl: data.url });
        } catch (_) {} finally { setUploading(false); }
      };
      reader.readAsDataURL(recordBlobRef.current);
    } catch (_) { setUploading(false); }
  };

  const cancelVoiceNote = () => {
    recordBlobRef.current = null;
    setRecordingReady(false);
    setRecordSeconds(0);
  };

  const sendHug = () => {
    sendMessage('🤗 Sending you a hug!', 'hug');
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
                <div className="text-[10px] font-semibold text-pink-500 mb-0.5">
                  Replying to {replyingTo.senderId?.username || 'message'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {replyingTo.type === 'image' ? '📷 Photo' : replyingTo.type === 'gif' ? '🎬 GIF' : (replyingTo.content || 'Message')}
                </div>
              </div>
              <button onClick={clearReplyingTo} className="text-gray-400 text-lg leading-none">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image / GIF preview panel */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100">
            <div className="px-4 py-3 bg-pink-50 dark:bg-rose-mid">
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <img src={imagePreview.dataUrl} alt="preview" className="w-20 h-20 rounded-xl object-cover border-2 border-pink-200" />
                  <button onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center">×</button>
                  {imagePreview.isGif && (
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1 rounded">GIF</div>
                  )}
                </div>
                <div className="flex-1">
                  {!imagePreview.isGif && (
                    <input placeholder="Add a caption..." value={text} onChange={e => setText(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark mb-2"
                      onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  )}
                  <button onClick={handleSend} disabled={uploading}
                    className="w-full py-2 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                    {uploading ? '⏳ Uploading...' : imagePreview.isGif ? 'Send GIF 🎬' : 'Send Photo 📷'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice note ready to send */}
      <AnimatePresence>
        {recordingReady && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100">
            <div className="flex items-center gap-3 px-4 py-3 bg-pink-50 dark:bg-rose-mid">
              <span className="text-2xl">🎤</span>
              <span className="flex-1 text-sm text-pink-600 font-medium">Voice note ready ({recordSeconds}s)</span>
              <button onClick={cancelVoiceNote} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs">Discard</button>
              <button onClick={sendVoiceNote} disabled={uploading}
                className="px-3 py-1.5 rounded-full text-white text-xs font-medium"
                style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                {uploading ? '⏳' : 'Send 📤'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      <AnimatePresence>
        {recording && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <div className="voice-wave text-red-400 flex items-center gap-0.5 h-4">
                {[1,2,3,4].map(i => <span key={i} style={{ height: `${8 + Math.random() * 8}px`, animationDelay: `${i * 0.1}s` }} />)}
              </div>
              <span className="text-sm text-red-600 font-medium flex-1">{recordSeconds}s</span>
              <button onClick={stopRecording} className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
                ⏹ Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extras panel */}
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
                { label: '📎 File', action: () => { fileAnyRef.current?.click(); setShowExtras(false); } },
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
              <input placeholder="Song title 🎵" value={songTitle} onChange={e => setSongTitle(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <input placeholder="Spotify / YouTube URL" value={songUrl} onChange={e => setSongUrl(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
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
              <textarea placeholder="Your surprise message..." value={text} onChange={e => setText(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none resize-none bg-white dark:bg-rose-dark" rows={2} />
              <input type="datetime-local" value={surpriseTime} onChange={e => setSurpriseTime(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none bg-white dark:bg-rose-dark" />
              <div className="flex gap-2">
                <button onClick={handleSendSurprise} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Schedule 🎁</button>
                <button onClick={() => setShowSurprise(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
      <input ref={fileAnyRef} type="file" accept="*/*" className="hidden" onChange={handleFileSelect} />

      {/* Main input row — clean, phone-optimised */}
      <div className="flex items-end gap-2 px-3 py-2">
        {/* Extras ✨ */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowExtras(s => !s)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg transition-colors">
          {showExtras ? '✕' : '✨'}
        </motion.button>

        {/* Camera 📷 */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-pink-50 dark:bg-rose-mid text-pink-400 text-lg transition-colors disabled:opacity-40">
          {uploading ? <svg className="animate-spin w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" /></svg> : '📷'}
        </motion.button>

        {/* Text input — supports keyboard GIF via paste */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={imagePreview ? '' : text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={imagePreview ? 'Caption above ↑' : replyingTo ? 'Write a reply... 💕' : 'Say something sweet... 💕'}
            disabled={!!imagePreview}
            rows={1}
            className="message-input resize-none py-2.5 leading-snug w-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '40px', maxHeight: '96px', overflowY: 'auto' }}
          />
        </div>

        {/* Mic (tap = start, tap again = stop) OR send button */}
        {!text.trim() && !imagePreview ? (
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={recording ? stopRecording : startRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: recording ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
            {recording ? '⏹' : '🎤'}
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
            disabled={(!text.trim() && !imagePreview) || uploading}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </motion.button>
        )}
      </div>
    </div>
  );
}
