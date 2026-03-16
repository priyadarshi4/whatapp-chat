import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import useAuthStore from '../store/authStore';

const AVATARS = ['🧑','👧','🧔','👩','🐱','🐶','🦊','🐼','🐨','🦁'];
const STICKERS = ['🌸','💕','⭐','🌙','🌈','🦋','🌺','💫','🎵','✨','🎀','🌻'];
const WALLPAPERS = [
  { label: 'Pink',   value: 'linear-gradient(135deg,#fce4ec,#f8bbd0)' },
  { label: 'Purple', value: 'linear-gradient(135deg,#f3e5f5,#e1bee7)' },
  { label: 'Sunset', value: 'linear-gradient(135deg,#fff9c4,#ffccbc)' },
  { label: 'Ocean',  value: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)' },
  { label: 'Night',  value: 'linear-gradient(135deg,#1a0a14,#2d1525)' },
];
const STATUS_COLORS = ['#FF4F8B','#CDB4DB','#FF8FB1','#8B5CF6','#F472B6','#34d399'];

/* ── Swipeable fullscreen gallery ── */
function Gallery({ items, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const startX = useRef(null);
  const cur = items[idx];
  if (!cur) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onTouchStart={e => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = startX.current - e.changedTouches[0].clientX;
        if (diff > 50) setIdx(i => Math.min(items.length - 1, i + 1));
        else if (diff < -50) setIdx(i => Math.max(0, i - 1));
      }}>
      <div className="flex justify-between items-center p-4 flex-shrink-0">
        <span className="text-white text-sm">{idx + 1} / {items.length}</span>
        <button onClick={onClose} className="text-white text-3xl leading-none">×</button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="w-full h-full flex items-center justify-center">
            {cur.type === 'video'
              ? <video src={cur.url} controls className="max-w-full max-h-full" />
              : <img src={cur.url} alt="" className="max-w-full max-h-full object-contain" />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-3 p-4 flex-shrink-0">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="text-white text-2xl disabled:opacity-30">‹</button>
        <div className="flex gap-1.5">
          {items.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />)}
        </div>
        <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1} className="text-white text-2xl disabled:opacity-30">›</button>
      </div>
    </motion.div>
  );
}

/* ── Status / Moment Card ── */
function MomentCard({ status, isMine, onClick, onDelete, onReact }) {
  const items = status.mediaItems?.length ? status.mediaItems
    : status.imageUrl ? [{ url: status.imageUrl, type: 'image' }] : [];
  const first = items[0];
  return (
    <motion.div whileTap={{ scale: 0.95 }} onClick={onClick} className="flex-shrink-0 w-20 cursor-pointer">
      <div className="w-20 h-24 rounded-2xl overflow-hidden relative shadow-sm"
        style={!first ? { background: status.backgroundColor || '#FF4F8B' } : {}}>
        {first ? (
          first.type === 'video'
            ? <><video src={first.url} className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center"><span className="text-white text-[8px] ml-0.5">▶</span></div></div></>
            : <img src={first.url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <p className="text-white text-[9px] text-center font-medium leading-tight">{status.content?.substring(0, 40)}</p>
          </div>
        )}
        {items.length > 1 && <div className="absolute top-1 right-1 bg-black/50 rounded text-white text-[8px] px-1">+{items.length}</div>}
        {isMine && <button onClick={e => { e.stopPropagation(); onDelete?.(); }} className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/40 text-white text-[8px] flex items-center justify-center">×</button>}
      </div>
      {!isMine && (
        <div className="flex gap-1 mt-1 justify-center">
          {['❤️','🌸'].map(emoji => (
            <button key={emoji} onClick={e => { e.stopPropagation(); onReact?.(emoji); }} className="text-sm active:scale-90 transition-transform">{emoji}</button>
          ))}
        </div>
      )}
      <div className="text-[9px] text-center text-gray-400 mt-0.5 truncate">{status.userId?.username || ''}</div>
    </motion.div>
  );
}

/* ── Create Moment Sheet ── */
function CreateMoment({ onClose, onCreate }) {
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#FF4F8B');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = e => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const mt = file.type.startsWith('video') ? 'video' : 'image';
        setMediaFiles(prev => [...prev, { dataUrl: ev.target.result, type: mt }]);
        setType(mt === 'video' ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      let mediaItems = [];
      if (mediaFiles.length > 0) {
        mediaItems = await Promise.all(mediaFiles.map(async f => {
          try {
            const { data } = await api.post('/upload', { data: f.dataUrl, type: f.type });
            return { url: data.url, type: f.type, thumbnail: data.thumbnail };
          } catch { return { url: f.dataUrl, type: f.type }; }
        }));
      }
      await onCreate({
        type: mediaFiles.length > 0 ? (mediaFiles[0].type === 'video' ? 'video' : 'image') : type,
        content, backgroundColor: bgColor,
        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
        imageUrl: mediaItems[0]?.url,
      });
    } catch (_) {} finally { setUploading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-rose-dark w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-display text-lg text-pink-500 font-semibold">Share a Moment 🌸</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          <div className="flex gap-2">
            {[['text','✍️ Text'],['image','📷 Photo']].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === v ? 'text-white' : 'bg-pink-50 text-pink-400 border border-pink-200'}`}
                style={type === v ? { background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' } : {}}>{l}</button>
            ))}
          </div>
          <div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 text-sm flex items-center justify-center gap-2">
              📷 Add Photos / Videos
            </button>
          </div>
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaFiles.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-pink-50">
                  {f.type === 'video' ? <video src={f.dataUrl} className="w-full h-full object-cover" /> : <img src={f.dataUrl} className="w-full h-full object-cover" alt="" />}
                  <button onClick={() => setMediaFiles(p => p.filter((_,j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">×</button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-pink-200 flex items-center justify-center text-2xl text-pink-300">+</button>
            </div>
          )}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Share what's on your mind... 💕" rows={3}
            className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none resize-none" />
          {mediaFiles.length === 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 flex-shrink-0">Background:</span>
              {STATUS_COLORS.map(c => (
                <button key={c} onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 transition-transform ${bgColor === c ? 'ring-2 ring-offset-2 ring-pink-400 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pt-3 pb-6 flex-shrink-0 border-t border-pink-100 bg-white dark:bg-rose-dark">
          <button onClick={handleSubmit} disabled={uploading || (!content && mediaFiles.length === 0)}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
            {uploading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40 20" /></svg>Sharing...</span> : 'Share Moment 🌸'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   MAIN ROOM PAGE
═══════════════════════════════════════ */
export default function RoomPage() {
  const { user } = useAuthStore();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('room');
  const [showDecor, setShowDecor] = useState(false);
  const [hugAnim, setHugAnim] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [gallery, setGallery] = useState(null);
  const [creating, setCreating] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const roomFileRef = useRef(null);

  useEffect(() => { loadRoom(); loadStatuses(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room?._id) return;
    socket.emit('room:join', room._id);
    const handler = ({ type }) => { setHugAnim(type); setTimeout(() => setHugAnim(null), 2500); };
    socket.on('room:animation', handler);
    return () => socket.off('room:animation', handler);
  }, [room?._id]);

  const loadRoom = async () => {
    try { const { data } = await api.get('/room'); setRoom(data.room); }
    catch (_) {} finally { setLoading(false); }
  };

  const loadStatuses = async () => {
    setStatusLoading(true);
    try { const { data } = await api.get('/status'); setStatuses(data.statuses || []); }
    catch (_) {} finally { setStatusLoading(false); }
  };

  const sendAnimation = type => {
    const socket = getSocket();
    if (socket && room?._id) socket.emit('room:animation', { roomId: room._id, type });
    setHugAnim(type); setTimeout(() => setHugAnim(null), 2500);
  };

  const handleAddRoomPhoto = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const { data: up } = await api.post('/upload', { data: ev.target.result, type: 'image' });
        const { data } = await api.post('/room/photo', { url: up.url, caption: '' });
        setRoom(data.room);
      } catch (_) {}
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const handleDecor = async content => {
    try {
      const { data } = await api.post('/room/decor', { type: 'sticker', content, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, scale: 1 });
      setRoom(data.room);
    } catch (_) {}
    setShowDecor(false);
  };

  const handleWallpaper = async wp => {
    try { const { data } = await api.patch('/room', { wallpaper: wp }); setRoom(data.room); } catch (_) {}
  };

  /* Convert YouTube / direct URL → embeddable URL */
  const buildEmbedUrl = url => {
    if (!url) return '';
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    // YouTube shorts
    const ytShort = url.match(/youtube\.com\/shorts\/([\w-]+)/);
    if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1`;
    // Direct video link — use as-is in <video> tag (signal with a prefix)
    return 'direct:' + url;
  };

  const handleSetVideo = async () => {
    if (!videoUrl.trim()) return;
    const embed = buildEmbedUrl(videoUrl.trim());
    setVideoEmbedUrl(embed);
    try {
      const { data } = await api.patch('/room/video', { url: videoUrl.trim(), title: 'Our video 🎬' });
      setRoom(data.room);
    } catch (_) {}
    setVideoUrl('');
  };

  /* Status helpers */
  const getMediaItems = s => s.mediaItems?.length ? s.mediaItems : s.imageUrl ? [{ url: s.imageUrl, type: 'image' }] : [];
  const myStatuses = statuses.filter(s => s.userId?._id === user?._id);
  const partnerStatuses = statuses.filter(s => s.userId?._id !== user?._id);
  const allMedia = statuses.flatMap(s => getMediaItems(s));

  const handleReact = async (id, emoji) => {
    try { await api.patch(`/status/${id}/react`, { emoji }); loadStatuses(); } catch (_) {}
  };
  const handleDeleteStatus = async id => {
    try { await api.delete(`/status/${id}`); loadStatuses(); } catch (_) {}
  };
  const handleCreateStatus = async form => {
    try { await api.post('/status', form); setCreating(false); loadStatuses(); } catch (_) {}
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-3xl animate-pulse">🏠</div></div>;

  const bg = room?.wallpaper || 'linear-gradient(135deg,#fce4ec,#f8bbd0)';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 bg-white dark:bg-rose-dark border-b border-pink-100 px-4 pt-3">
        <div className="flex gap-1 bg-pink-50 dark:bg-rose-mid p-1 rounded-xl mb-3">
          {[['room','🏠 Room'],['moments','🌸 Moments'],['photos','📷 Photos'],['watch','🎬 Watch']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${tab === k ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-24 space-y-4">

          {/* ══ ROOM TAB ══ */}
          {tab === 'room' && (
            <>
              {/* Virtual room canvas */}
              <div className="relative rounded-3xl overflow-hidden" style={{ background: bg, minHeight: '220px' }}>
                {room?.decorations?.map((d, i) => (
                  <div key={i} className="absolute text-2xl select-none pointer-events-none"
                    style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `scale(${d.scale || 1})` }}>{d.content}</div>
                ))}
                <div className="absolute bottom-4 left-0 right-0 flex items-end justify-center gap-6">
                  {[{ avatar: room?.avatarA || '🧑', idx: 0, delay: 0 }, { avatar: room?.avatarB || '👧', idx: 1, delay: 0.5 }].map((av, i) => (
                    <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: av.delay }}
                      className="flex flex-col items-center">
                      <div className="text-4xl">{av.avatar}</div>
                    </motion.div>
                  ))}
                  <div className="text-xl mb-2 absolute">💕</div>
                </div>
                <div className="absolute top-3 left-0 right-0 text-center">
                  <span className="text-sm font-semibold text-white/90 bg-black/20 px-3 py-1 rounded-full">{room?.roomName || 'Our Room 💕'}</span>
                </div>
                <AnimatePresence>
                  {hugAnim && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0.5, 1.5, 1], opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-8xl">{hugAnim === 'hug' ? '🤗' : hugAnim === 'kiss' ? '💋' : '💕'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Anim buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[['🤗 Hug','hug'],['💋 Kiss','kiss'],['💕 Love','love']].map(([l, t]) => (
                  <motion.button key={t} whileTap={{ scale: 0.9 }} onClick={() => sendAnimation(t)}
                    className="py-3 rounded-2xl text-sm font-medium text-pink-500 border border-pink-200 bg-white dark:bg-rose-mid">{l}</motion.button>
                ))}
              </div>

              {/* Wallpaper */}
              <div className="glass-card p-3">
                <p className="text-xs text-gray-500 font-semibold mb-2">🎨 Wallpaper</p>
                <div className="flex gap-2">
                  {WALLPAPERS.map(wp => (
                    <button key={wp.label} onClick={() => handleWallpaper(wp.value)}
                      className={`flex-1 h-10 rounded-xl ${room?.wallpaper === wp.value ? 'ring-2 ring-pink-400 ring-offset-1' : ''}`}
                      style={{ background: wp.value }} />
                  ))}
                </div>
              </div>

              {/* Avatars */}
              <div className="glass-card p-3">
                <p className="text-xs text-gray-500 font-semibold mb-2">🧑 Your Avatar</p>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map(a => {
                    const isUserA = room?.participants?.[0]?.toString() === user?._id;
                    const mine = isUserA ? room?.avatarA : room?.avatarB;
                    return (
                      <button key={a} onClick={() => api.patch('/room', isUserA ? { avatarA: a } : { avatarB: a }).then(r => setRoom(r.data.room))}
                        className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center ${mine === a ? 'bg-pink-100 ring-1 ring-pink-400' : 'bg-gray-50'}`}>{a}</button>
                    );
                  })}
                </div>
              </div>

              {/* Sticker decor */}
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-semibold">✨ Stickers</p>
                  <button onClick={() => setShowDecor(s => !s)} className="text-xs text-pink-400">{showDecor ? 'Close' : '+ Add'}</button>
                </div>
                <AnimatePresence>
                  {showDecor && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-6 gap-2">
                        {STICKERS.map(s => <button key={s} onClick={() => handleDecor(s)} className="text-2xl active:scale-90 transition-transform">{s}</button>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* ══ MOMENTS TAB ══ */}
          {tab === 'moments' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-pink-500">🌸 Moments</h2>
                <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>+ Moment</button>
              </div>

              {/* My moments */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">My Moments</p>
                {statusLoading ? <div className="skeleton h-24 rounded-2xl" /> :
                  myStatuses.length === 0 ? (
                    <button onClick={() => setCreating(true)} className="w-full h-24 rounded-2xl border-2 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-300 gap-1">
                      <span className="text-2xl">+</span><span className="text-xs">Share a moment</span>
                    </button>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                      {myStatuses.map(s => (
                        <MomentCard key={s._id} status={s} isMine
                          onClick={() => { const items = getMediaItems(s); if (items.length) setGallery({ items }); }}
                          onDelete={() => handleDeleteStatus(s._id)} />
                      ))}
                    </div>
                  )}
              </div>

              {/* Partner moments */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Their Moments</p>
                {statusLoading ? <div className="skeleton h-24 rounded-2xl" /> :
                  partnerStatuses.length === 0
                    ? <div className="text-center py-8 text-gray-300 text-sm">No moments yet 🌸</div>
                    : (
                      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {partnerStatuses.map(s => (
                          <MomentCard key={s._id} status={s} isMine={false}
                            onClick={() => { const items = getMediaItems(s); if (items.length) setGallery({ items }); }}
                            onReact={emoji => handleReact(s._id, emoji)} />
                        ))}
                      </div>
                    )}
              </div>
            </>
          )}

          {/* ══ PHOTOS TAB ══ */}
          {tab === 'photos' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{(room?.photos?.length || 0) + allMedia.length} photos / videos</p>
                <button onClick={() => roomFileRef.current?.click()} className="px-3 py-1.5 rounded-full text-white text-xs" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>+ Add</button>
                <input ref={roomFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddRoomPhoto} />
              </div>

              {/* Room photos */}
              {room?.photos?.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Room Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {room.photos.map((p, i) => (
                      <motion.div key={i} whileTap={{ scale: 0.97 }} onClick={() => setGallery({ items: room.photos.map(x => ({ url: x.url, type: 'image' })), startIndex: i })}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-pink-50">
                        <img src={p.url} className="w-full h-full object-cover" alt="" />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {/* Moments media */}
              {allMedia.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-2">Moments Timeline</p>
                  <div className="grid grid-cols-3 gap-2">
                    {allMedia.map((item, i) => (
                      <motion.div key={i} whileTap={{ scale: 0.97 }} onClick={() => setGallery({ items: allMedia, startIndex: i })}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-pink-100 relative">
                        {item.type === 'video'
                          ? <><video src={item.url} className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"><span className="text-white text-xs">▶</span></div></div></>
                          : <img src={item.url} className="w-full h-full object-cover" alt="" />}
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
              {room?.photos?.length === 0 && allMedia.length === 0 && (
                <div className="text-center py-12 text-gray-300"><div className="text-4xl mb-2">📷</div><p className="text-sm">No photos yet!</p></div>
              )}
            </>
          )}

          {/* ══ WATCH TAB ══ */}
          {tab === 'watch' && (
            <>
              <div className="glass-card p-4">
                <p className="text-sm font-semibold text-pink-500 mb-1">🎬 Watch Together</p>
                <p className="text-xs text-gray-400 mb-3">Paste a YouTube link or any direct video URL</p>
                <div className="flex gap-2 mb-2">
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetVideo()}
                    placeholder="https://youtube.com/watch?v=... or video URL"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none focus:border-pink-400" />
                  <button onClick={handleSetVideo} className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Play ▶</button>
                </div>
                <p className="text-[10px] text-gray-400">Supports: YouTube, direct .mp4/.webm links</p>
              </div>

              {/* Video player */}
              {videoEmbedUrl && (
                <div className="glass-card overflow-hidden">
                  <div className="aspect-video bg-black">
                    {videoEmbedUrl.startsWith('direct:') ? (
                      <video src={videoEmbedUrl.replace('direct:', '')} controls autoPlay className="w-full h-full" />
                    ) : (
                      <iframe
                        src={videoEmbedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title="Watch together"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 p-3">
                    <button onClick={() => sendAnimation('hug')} className="flex-1 py-2 rounded-xl text-sm border border-pink-200 text-pink-500 active:scale-95 transition-transform">🤗 Hug</button>
                    <button onClick={() => sendAnimation('kiss')} className="flex-1 py-2 rounded-xl text-sm border border-pink-200 text-pink-500 active:scale-95 transition-transform">💋 Kiss</button>
                    <button onClick={() => sendAnimation('love')} className="flex-1 py-2 rounded-xl text-sm border border-pink-200 text-pink-500 active:scale-95 transition-transform">💕 Love</button>
                  </div>
                </div>
              )}

              {/* Load previously saved video */}
              {!videoEmbedUrl && room?.currentVideo?.url && (
                <div className="glass-card p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">Last watched: <span className="text-pink-500">{room.currentVideo.title}</span></p>
                  <button onClick={() => setVideoEmbedUrl(buildEmbedUrl(room.currentVideo.url))}
                    className="px-6 py-2 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                    ▶ Resume
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create moment modal */}
      <AnimatePresence>
        {creating && <CreateMoment onClose={() => setCreating(false)} onCreate={handleCreateStatus} />}
      </AnimatePresence>

      {/* Gallery */}
      <AnimatePresence>
        {gallery && <Gallery items={gallery.items} startIndex={gallery.startIndex || 0} onClose={() => setGallery(null)} />}
      </AnimatePresence>
    </div>
  );
}
