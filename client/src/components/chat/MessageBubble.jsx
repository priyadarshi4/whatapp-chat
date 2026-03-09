import React, { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import useChatStore from '../../store/chatStore';

const REACTION_EMOJIS = ['❤️', '😘', '🥰', '💕', '😍', '🌸'];

// FEATURE 6: WhatsApp-style delivery tick SVGs
function DeliveryTick({ status, isMine }) {
  if (!isMine) return null;
  if (status === 'sending') {
    return <span className="text-[10px] opacity-40 ml-0.5">⏳</span>;
  }
  if (status === 'sent') {
    return (
      <svg className="inline-block ml-0.5 opacity-60" width="14" height="10" viewBox="0 0 16 11" fill="white">
        <path d="M1 6L5 10L15 1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (status === 'delivered') {
    return (
      <svg className="inline-block ml-0.5 opacity-60" width="18" height="10" viewBox="0 0 20 11" fill="none">
        <path d="M1 6L5 10L15 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 6L10 10L20 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (status === 'read') {
    return (
      <svg className="inline-block ml-0.5" width="18" height="10" viewBox="0 0 20 11" fill="none">
        <path d="M1 6L5 10L15 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 6L10 10L20 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return null;
}

// FEATURE 1: Reply preview inside bubble
function ReplyPreview({ replyTo, isMine, onScrollTo }) {
  if (!replyTo) return null;
  const isImage = replyTo.type === 'image';
  const label = replyTo.senderId?.username || 'Unknown';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onScrollTo?.(replyTo._id); }}
      className={`w-full text-left rounded-lg px-2 py-1.5 mb-1.5 border-l-2 ${
        isMine
          ? 'bg-white/20 border-white/60'
          : 'bg-black/5 dark:bg-white/10 border-pink-400'
      }`}
    >
      <div className={`text-[10px] font-semibold mb-0.5 ${isMine ? 'text-white/80' : 'text-pink-500'}`}>
        {label}
      </div>
      {isImage ? (
        <div className="text-[11px] opacity-70 flex items-center gap-1">
          <span>📷</span> Photo
        </div>
      ) : (
        <div className={`text-[11px] truncate max-w-[200px] ${isMine ? 'text-white/70' : 'text-gray-500 dark:text-pink-200'}`}>
          {replyTo.content || 'Message'}
        </div>
      )}
    </button>
  );
}

const MessageBubble = memo(({ message, isMine, showAvatar, onScrollToMessage }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const { chat, setReplyingTo } = useChatStore();

  // FEATURE 1: Swipe to reply
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, isMine ? [-60, -20] : [20, 60], [1, 0]);
  const replyScale = useTransform(x, isMine ? [-60, -20] : [20, 60], [1, 0.5]);
  const dragControls = useAnimation();
  const hasTriggeredReply = useRef(false);

  const handleDragEnd = useCallback((_, info) => {
    const threshold = 55;
    const shouldReply = isMine ? info.offset.x < -threshold : info.offset.x > threshold;
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

  const handlePin = () => {
    const socket = getSocket();
    if (socket) socket.emit('message:pin', { messageId: message._id, chatId: chat?._id });
    setShowReactions(false);
  };

  const handleReply = () => {
    setReplyingTo(message);
    setShowReactions(false);
  };

  const isDeleted = message.isDeleted;
  const isTimeCapsule = (message.type === 'time_capsule' || message.type === 'surprise') && !message.isUnlocked;
  const isMissYou = message.type === 'miss_you';
  const isGoodMorning = message.type === 'good_morning';
  const isGoodNight = message.type === 'good_night';
  // Only show blue ticks if server explicitly set deliveryStatus='read'
  const deliveryStatus = message.deliveryStatus || 'sent';

  const reactionCounts = {};
  (message.reactions || []).forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <>
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 relative px-1`}>
        {/* Swipe reply indicator - shows on opposite side */}
        <motion.div
          style={{ opacity: replyOpacity, scale: replyScale }}
          className={`absolute top-1/2 -translate-y-1/2 text-pink-400 ${isMine ? 'left-2' : 'right-2'} pointer-events-none`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={isMine ? '' : 'scale-x-[-1]'}>
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
          </svg>
        </motion.div>

        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: isMine ? -80 : 0, right: isMine ? 0 : 80 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          animate={dragControls}
          style={{ x }}
          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}
          onContextMenu={(e) => { e.preventDefault(); setShowReactions(s => !s); }}
        >
          {/* Special decorators */}
          {isMissYou && <div className="text-xs text-pink-400 mb-1 font-medium">💕 Sent with love</div>}
          {isGoodMorning && <div className="text-xs text-amber-400 mb-1">☀️ Good Morning!</div>}
          {isGoodNight && <div className="text-xs text-indigo-400 mb-1">🌙 Good Night!</div>}
          {message.isPinned && <div className="text-[10px] text-pink-400 mb-0.5">📌 Pinned</div>}

          {/* Bubble */}
          <div
            className={`relative cursor-pointer select-none ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}
            onClick={() => setShowReactions(s => !s)}
          >
            {/* FEATURE 1: Reply preview inside bubble */}
            {message.replyTo && (
              <ReplyPreview
                replyTo={message.replyTo}
                isMine={isMine}
                onScrollTo={onScrollToMessage}
              />
            )}

            {isDeleted ? (
              <span className="italic opacity-50 text-xs">Message deleted</span>
            ) : isTimeCapsule ? (
              <TimeCapsuleBubble message={message} />
            ) : message.type === 'image' && message.mediaUrl ? (
              <ImageBubble url={message.mediaUrl} onFullscreen={setFullscreenImg} />
            ) : message.type === 'song' && message.songData ? (
              <SongBubble song={message.songData} content={message.content} />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Time + delivery ticks */}
            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                {formatTime(message.createdAt)}
              </span>
              {/* FEATURE 6: Delivery status ticks */}
              <DeliveryTick status={deliveryStatus} isMine={isMine} />
            </div>
          </div>

          {/* Reactions display */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-white dark:bg-rose-mid border border-pink-100 dark:border-pink-900 shadow-sm">
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Reaction picker + actions */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-14 z-20 flex gap-1 bg-white dark:bg-rose-mid rounded-full px-3 py-2 shadow-xl border border-pink-100`}
                onClick={e => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    className="text-xl active:scale-90 transition-transform">{emoji}</button>
                ))}
                <div className="w-px bg-pink-100 mx-0.5" />
                <button onClick={handleReply} className="text-sm text-pink-400 px-1" title="Reply">↩</button>
                <button onClick={handlePin} className="text-sm text-gray-400 px-1" title="Pin">📌</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* FEATURE 2: Full-screen image preview */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setFullscreenImg(null)}
          >
            <motion.img
              src={fullscreenImg}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button className="absolute top-4 right-4 text-white text-3xl leading-none"
              onClick={() => setFullscreenImg(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// FEATURE 2: Image bubble with tap-to-fullscreen
const ImageBubble = memo(({ url, onFullscreen }) => (
  <div
    className="rounded-xl overflow-hidden cursor-pointer"
    style={{ maxWidth: '220px', minWidth: '120px' }}
    onClick={(e) => { e.stopPropagation(); onFullscreen(url); }}
  >
    <img src={url} alt="shared" className="w-full object-cover block" loading="lazy"
      style={{ maxHeight: '280px', objectFit: 'cover' }} />
    <div className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors rounded-xl" />
  </div>
));

const SongBubble = memo(({ song, content }) => (
  <div className="flex items-center gap-3" style={{ minWidth: '180px' }}>
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-pink-200 flex items-center justify-center text-xl">
      {song.thumbnail
        ? <img src={song.thumbnail} className="w-full h-full object-cover" alt="" />
        : '🎵'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{song.title || 'Song'}</div>
      {song.artist && <div className="text-xs opacity-70 truncate">{song.artist}</div>}
      {content && <div className="text-xs mt-0.5 opacity-80">{content}</div>}
    </div>
    {song.url && (
      <a href={song.url} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()} className="flex-shrink-0 text-base">🎧</a>
    )}
  </div>
));

const TimeCapsuleBubble = memo(({ message }) => (
  <div className="text-center py-2 px-1">
    <div className="text-2xl mb-1">🔒</div>
    <div className="text-sm font-medium">Surprise!</div>
    <div className="text-xs opacity-70 mt-0.5">
      Opens {message.unlockAt ? new Date(message.unlockAt).toLocaleDateString() : 'soon'}
    </div>
  </div>
));

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default MessageBubble;
