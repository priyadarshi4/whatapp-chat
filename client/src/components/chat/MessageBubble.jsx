import React, { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import useChatStore from '../../store/chatStore';
import api from '../../utils/api';

const REACTION_EMOJIS = ['❤️', '😘', '🥰', '💕', '😍', '🌸'];

function DeliveryTick({ status, isMine }) {
  if (!isMine) return null;
  if (status === 'sending') return <span className="text-[10px] opacity-40 ml-0.5">⏳</span>;
  if (status === 'sent') return (
    <svg className="inline-block ml-0.5 opacity-60" width="14" height="10" viewBox="0 0 16 11" fill="white">
      <path d="M1 6L5 10L15 1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === 'delivered') return (
    <svg className="inline-block ml-0.5 opacity-60" width="18" height="10" viewBox="0 0 20 11" fill="none">
      <path d="M1 6L5 10L15 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L10 10L20 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === 'read') return (
    <svg className="inline-block ml-0.5" width="18" height="10" viewBox="0 0 20 11" fill="none">
      <path d="M1 6L5 10L15 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L10 10L20 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return null;
}

function ReplyPreview({ replyTo, isMine, onScrollTo }) {
  if (!replyTo) return null;
  return (
    <button onClick={(e) => { e.stopPropagation(); onScrollTo?.(replyTo._id); }}
      className={`w-full text-left rounded-lg px-2 py-1.5 mb-1.5 border-l-2 ${isMine ? 'bg-white/20 border-white/60' : 'bg-black/5 dark:bg-white/10 border-pink-400'}`}>
      <div className={`text-[10px] font-semibold mb-0.5 ${isMine ? 'text-white/80' : 'text-pink-500'}`}>
        {replyTo.senderId?.username || 'Unknown'}
      </div>
      <div className={`text-[11px] truncate max-w-[200px] ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
        {replyTo.type === 'image' ? '📷 Photo' : replyTo.type === 'gif' ? '🎬 GIF' : (replyTo.content || 'Message')}
      </div>
    </button>
  );
}

const MessageBubble = memo(({ message, isMine, onScrollToMessage }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const { chat, setReplyingTo, deleteMessage } = useChatStore();
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, isMine ? [-60, -20] : [20, 60], [1, 0]);
  const dragControls = useAnimation();
  const hasTriggeredReply = useRef(false);

  const handleDragEnd = useCallback((_, info) => {
    const shouldReply = isMine ? info.offset.x < -55 : info.offset.x > 55;
    if (shouldReply && !hasTriggeredReply.current) {
      hasTriggeredReply.current = true;
      setReplyingTo(message);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    hasTriggeredReply.current = false;
    dragControls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
  }, [isMine, message, setReplyingTo]);

  const handleReact = (emoji) => {
    const socket = getSocket();
    if (socket) socket.emit('message:react', { messageId: message._id, emoji, chatId: chat?._id });
    setShowReactions(false);
  };

  const handleDelete = async (deleteFor) => {
    try {
      const socket = getSocket();
      if (socket) socket.emit('message:delete', { messageId: message._id, chatId: chat?._id, deleteFor });
      deleteMessage(message._id, deleteFor);
    } catch (_) {}
    setShowDeleteMenu(false);
    setShowReactions(false);
  };

  const isDeleted = message.isDeleted || message.deletedForEveryone;
  const isMidnight = message.type === 'midnight_message';
  const deliveryStatus = message.deliveryStatus || 'sent';

  const reactionCounts = {};
  (message.reactions || []).forEach(r => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1; });

  // Midnight message — special centered display
  if (isMidnight) {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-200 dark:border-purple-800 rounded-2xl px-4 py-3 text-center max-w-xs">
          <div className="text-lg mb-1">🌙</div>
          <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">{message.content}</p>
          <p className="text-[10px] text-purple-400 mt-1">Midnight message 💫</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 relative px-1`}>
        <motion.div style={{ opacity: replyOpacity }}
          className={`absolute top-1/2 -translate-y-1/2 text-pink-400 ${isMine ? 'left-2' : 'right-2'} pointer-events-none`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={isMine ? '' : 'scale-x-[-1]'}>
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
        </motion.div>

        <motion.div drag="x" dragDirectionLock
          dragConstraints={{ left: isMine ? -80 : 0, right: isMine ? 0 : 80 }}
          dragElastic={0.3} onDragEnd={handleDragEnd} animate={dragControls} style={{ x }}
          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}
          onContextMenu={(e) => { e.preventDefault(); setShowReactions(s => !s); }}>

          {message.type === 'miss_you' && <div className="text-xs text-pink-400 mb-1 font-medium">💕 Sent with love</div>}
          {message.type === 'good_morning' && <div className="text-xs text-amber-400 mb-1">☀️ Good Morning!</div>}
          {message.type === 'good_night' && <div className="text-xs text-indigo-400 mb-1">🌙 Good Night!</div>}
          {message.type === 'hug' && <div className="text-xs text-pink-400 mb-1 animate-bounce">🤗 Sending a hug!</div>}
          {message.isPinned && <div className="text-[10px] text-pink-400 mb-0.5">📌 Pinned</div>}

          <div className={`relative cursor-pointer select-none ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}
            onClick={() => setShowReactions(s => !s)}>
            {message.replyTo && <ReplyPreview replyTo={message.replyTo} isMine={isMine} onScrollTo={onScrollToMessage} />}

            {isDeleted ? (
              <span className="italic opacity-50 text-xs">🚫 {isMine ? 'You deleted this message' : 'This message was deleted'}</span>
            ) : message.type === 'image' && message.mediaUrl ? (
              <ImageBubble url={message.mediaUrl} onFullscreen={setFullscreenImg} />
            ) : message.type === 'gif' && message.gifUrl ? (
              <GifBubble url={message.gifUrl} />
            ) : message.type === 'voice_note' && message.mediaUrl ? (
              <VoiceNoteBubble url={message.mediaUrl} isMine={isMine} />
            ) : message.type === 'file' && message.mediaUrl ? (
              <FileBubble message={message} isMine={isMine} />
            ) : message.type === 'location' && message.location ? (
              <LocationBubble location={message.location} />
            ) : message.type === 'song' && message.songData ? (
              <SongBubble song={message.songData} content={message.content} />
            ) : message.type === 'hug' ? (
              <HugBubble isMine={isMine} />
            ) : (message.type === 'surprise' || message.type === 'time_capsule') && !message.isUnlocked ? (
              <div className="text-center p-2">
                <div className="text-2xl">🔒</div>
                <div className="text-sm font-medium">Surprise!</div>
                <div className="text-xs opacity-70">Opens {message.unlockAt ? new Date(message.unlockAt).toLocaleDateString() : 'soon'}</div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            )}

            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{formatTime(message.createdAt)}</span>
              <DeliveryTick status={deliveryStatus} isMine={isMine} />
            </div>
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-white dark:bg-rose-mid border border-pink-100 shadow-sm">
                  <span>{emoji}</span>{count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showReactions && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-14 z-20 flex gap-1 bg-white dark:bg-rose-mid rounded-full px-3 py-2 shadow-xl border border-pink-100`}
                onClick={e => e.stopPropagation()}>
                {REACTION_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)} className="text-xl active:scale-90 transition-transform">{emoji}</button>
                ))}
                <div className="w-px bg-pink-100 mx-0.5" />
                <button onClick={() => { setReplyingTo(message); setShowReactions(false); }} className="text-sm text-pink-400 px-1" title="Reply">↩</button>
                {!isDeleted && (
                  <button onClick={() => { setShowDeleteMenu(true); setShowReactions(false); }} className="text-sm text-red-400 px-1" title="Delete">🗑</button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Delete menu */}
      <AnimatePresence>
        {showDeleteMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowDeleteMenu(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white dark:bg-rose-dark w-full rounded-t-3xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-center font-semibold text-gray-700 dark:text-pink-100 mb-4">Delete Message?</h3>
              {isMine && (
                <button onClick={() => handleDelete('everyone')}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium border border-red-200 active:scale-95 transition-transform">
                  🗑 Delete for Everyone
                </button>
              )}
              <button onClick={() => handleDelete('me')}
                className="w-full py-3 rounded-xl bg-gray-50 text-gray-600 font-medium border border-gray-200 active:scale-95 transition-transform">
                Delete for Me
              </button>
              <button onClick={() => setShowDeleteMenu(false)}
                className="w-full py-3 rounded-xl text-pink-500 font-medium">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreenImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={() => setFullscreenImg(null)}>
            <img src={fullscreenImg} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullscreenImg(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

const ImageBubble = ({ url, onFullscreen }) => (
  <div className="rounded-xl overflow-hidden cursor-pointer" style={{ maxWidth: '220px' }}
    onClick={(e) => { e.stopPropagation(); onFullscreen(url); }}>
    <img src={url} alt="shared" className="w-full object-cover block" style={{ maxHeight: '280px' }} loading="lazy" />
  </div>
);

const GifBubble = ({ url }) => (
  <div className="rounded-xl overflow-hidden" style={{ maxWidth: '200px' }}>
    <img src={url} alt="gif" className="w-full object-cover block" />
    <div className="bg-black/60 text-white text-[9px] px-1.5 py-0.5 absolute bottom-1 left-1 rounded">GIF</div>
  </div>
);

const VoiceNoteBubble = ({ url, isMine }) => {
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent]   = useState(0);
  const audioRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Generate fake waveform bars (consistent per URL)
  const bars = Array.from({ length: 30 }, (_, i) => {
    const seed = (url?.charCodeAt(i % (url?.length || 1)) || i) * 13 + i * 7;
    return 20 + (seed % 65);
  });

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: '200px', maxWidth: '240px' }}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const d = audioRef.current.duration || 0;
          const c = audioRef.current.currentTime;
          setProgress(d ? c / d : 0);
          setCurrent(c);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration || 0);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90
          ${isMine ? 'bg-white/25' : 'bg-pink-500'}`}
        style={!isMine ? { boxShadow: '0 2px 8px rgba(255,79,139,0.4)' } : {}}
      >
        {playing
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill={isMine ? 'white' : 'white'}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill={isMine ? 'white' : 'white'} style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z"/></svg>
        }
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Waveform bars — tap to seek */}
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all"
                style={{
                  height: `${h}%`,
                  background: isMine
                    ? (filled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)')
                    : (filled ? '#FF4F8B' : '#e0c0cc'),
                  minWidth: '2px',
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <div className={`text-[10px] font-medium ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
          {playing ? fmt(current) : fmt(duration || 0)}
        </div>
      </div>

      {/* Mic icon */}
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 opacity-60"
        stroke={isMine ? 'white' : '#FF4F8B'} strokeWidth="2" strokeLinecap="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3"/>
        <path d="M5 10a7 7 0 0014 0"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="9" y1="22" x2="15" y2="22"/>
      </svg>
    </div>
  );
};

const FileBubble = ({ message, isMine }) => (
  <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-2 min-w-[160px]" onClick={e => e.stopPropagation()}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${isMine ? 'bg-white/20' : 'bg-pink-100'}`}>
      {message.fileMime?.includes('pdf') ? '📄' : message.fileMime?.includes('image') ? '🖼' : '📎'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{message.fileName || 'File'}</div>
      <div className="text-[10px] opacity-60">{message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Tap to open'}</div>
    </div>
  </a>
);

const LocationBubble = ({ location }) => (
  <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer"
    className="block rounded-xl overflow-hidden" style={{ minWidth: '180px' }} onClick={e => e.stopPropagation()}>
    <div className="bg-green-100 dark:bg-green-900 px-3 py-2 flex items-center gap-2">
      <span className="text-xl">{location.isLive ? '🔴' : '📍'}</span>
      <div>
        <div className="text-sm font-medium text-green-800 dark:text-green-200">
          {location.isLive ? 'Live Location' : 'Location'}
        </div>
        {location.address && <div className="text-xs text-green-600 truncate max-w-[150px]">{location.address}</div>}
      </div>
    </div>
  </a>
);

const HugBubble = ({ isMine }) => (
  <div className="text-center py-2">
    <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }} transition={{ repeat: 2, duration: 0.5 }} className="text-4xl">🤗</motion.div>
    <div className="text-xs mt-1 opacity-80">{isMine ? 'You sent a hug!' : 'Sent you a hug!'}</div>
  </div>
);

const SongBubble = ({ song, content }) => (
  <div className="flex items-center gap-3" style={{ minWidth: '180px' }}>
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-pink-200 flex items-center justify-center text-xl">
      {song.thumbnail ? <img src={song.thumbnail} className="w-full h-full object-cover" /> : '🎵'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{song.title || 'Song'}</div>
      {song.artist && <div className="text-xs opacity-70 truncate">{song.artist}</div>}
      {content && <div className="text-xs mt-0.5 opacity-80">{content}</div>}
    </div>
    {song.url && <a href={song.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-base">🎧</a>}
  </div>
);

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default MessageBubble;
