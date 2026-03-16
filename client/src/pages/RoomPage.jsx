import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import useAuthStore from '../store/authStore';

const AVATARS = ['🧑','👧','🧔','👩','🐱','🐶','🦊','🐼','🐨','🦁'];
const STICKERS = ['🌸','💕','⭐','🌙','🌈','🦋','🌺','💫','🎵','✨','🎀','🌻'];
const WALLPAPERS = [
  { label: 'Pink', value: 'linear-gradient(135deg,#fce4ec,#f8bbd0)' },
  { label: 'Purple', value: 'linear-gradient(135deg,#f3e5f5,#e1bee7)' },
  { label: 'Sunset', value: 'linear-gradient(135deg,#fff9c4,#ffccbc)' },
  { label: 'Ocean', value: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)' },
  { label: 'Night', value: 'linear-gradient(135deg,#1a0a14,#2d1525)' },
];

export default function RoomPage() {
  const { user } = useAuthStore();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('room'); // room | photos | video
  const [showDecor, setShowDecor] = useState(false);
  const [hugAnim, setHugAnim] = useState(null); // 'hug' | 'kiss'
  const [videoUrl, setVideoUrl] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { loadRoom(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room?._id) return;
    socket.emit('room:join', room._id);
    const handler = ({ type, from }) => {
      setHugAnim(type);
      setTimeout(() => setHugAnim(null), 2500);
    };
    socket.on('room:animation', handler);
    return () => socket.off('room:animation', handler);
  }, [room?._id]);

  const loadRoom = async () => {
    try {
      const { data } = await api.get('/room');
      setRoom(data.room);
    } catch (_) {} finally { setLoading(false); }
  };

  const sendAnimation = (type) => {
    const socket = getSocket();
    if (socket && room?._id) socket.emit('room:animation', { roomId: room._id, type });
    setHugAnim(type);
    setTimeout(() => setHugAnim(null), 2500);
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { data: upData } = await api.post('/upload', { data: ev.target.result, type: 'image' });
        const { data } = await api.post('/room/photo', { url: upData.url, caption: '' });
        setRoom(data.room);
      } catch (_) {}
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddDecor = async (content) => {
    try {
      const { data } = await api.post('/room/decor', {
        type: 'sticker', content,
        x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, scale: 1,
      });
      setRoom(data.room);
    } catch (_) {}
    setShowDecor(false);
  };

  const handleWallpaper = async (wp) => {
    try {
      const { data } = await api.patch('/room', { wallpaper: wp });
      setRoom(data.room);
    } catch (_) {}
  };

  const handleSetVideo = async () => {
    if (!videoUrl) return;
    try {
      const { data } = await api.patch('/room/video', { url: videoUrl, title: 'Our video 🎬' });
      setRoom(data.room);
      setVideoUrl('');
    } catch (_) {}
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-3xl animate-pulse">🏠</div></div>;

  const bg = room?.wallpaper || 'linear-gradient(135deg,#fce4ec,#f8bbd0)';
  const isUserA = room?.participants?.[0]?.toString() === user?._id;

  return (
    <div className="h-full overflow-y-auto">
      <div className="pb-24">
        {/* Tab header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-rose-dark border-b border-pink-100 px-4 pt-3 pb-0">
          <h1 className="font-display text-xl font-bold text-pink-500 mb-2">🏠 Our Room</h1>
          <div className="flex gap-1 bg-pink-50 p-1 rounded-xl mb-3">
            {[['room','🏠 Room'],['photos','📷 Photos'],['video','🎬 Watch']].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${tab === key ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ROOM TAB */}
        {tab === 'room' && (
          <div className="px-4 pt-3 space-y-4">
            {/* Virtual room */}
            <div className="relative rounded-3xl overflow-hidden shadow-card" style={{ background: bg, minHeight: '240px' }}>
              {/* Decorations */}
              {room?.decorations?.map((d, i) => (
                <div key={i} className="absolute text-2xl cursor-default select-none"
                  style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `scale(${d.scale || 1})` }}>
                  {d.content}
                </div>
              ))}

              {/* Avatars sitting together */}
              <div className="absolute bottom-6 left-0 right-0 flex items-end justify-center gap-6">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }}
                  className="flex flex-col items-center">
                  <div className="text-5xl">{room?.avatarA || '🧑'}</div>
                  <div className="text-xs text-white/80 bg-black/20 px-2 py-0.5 rounded-full mt-1">{room?.participants?.[0]?.username || 'You'}</div>
                </motion.div>
                <div className="text-2xl mb-3">💕</div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  className="flex flex-col items-center">
                  <div className="text-5xl">{room?.avatarB || '👧'}</div>
                  <div className="text-xs text-white/80 bg-black/20 px-2 py-0.5 rounded-full mt-1">{room?.participants?.[1]?.username || 'Love'}</div>
                </motion.div>
              </div>

              {/* Room name */}
              <div className="absolute top-3 left-0 right-0 text-center">
                <span className="text-sm font-semibold text-white/90 bg-black/20 px-3 py-1 rounded-full">
                  {room?.roomName || 'Our Room 💕'}
                </span>
              </div>

              {/* Hug/Kiss animation overlay */}
              <AnimatePresence>
                {hugAnim && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0.5, 1.5, 1], opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-8xl">{hugAnim === 'hug' ? '🤗' : hugAnim === 'kiss' ? '💋' : '💕'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '🤗 Hug', action: () => sendAnimation('hug') },
                { label: '💋 Kiss', action: () => sendAnimation('kiss') },
                { label: '💕 Love', action: () => sendAnimation('love') },
              ].map(btn => (
                <motion.button key={btn.label} whileTap={{ scale: 0.9 }} onClick={btn.action}
                  className="py-3 rounded-2xl text-sm font-medium text-pink-500 border border-pink-200 bg-white dark:bg-rose-mid">
                  {btn.label}
                </motion.button>
              ))}
            </div>

            {/* Wallpaper picker */}
            <div className="glass-card p-3">
              <p className="text-xs text-gray-500 font-semibold mb-2">🎨 Wallpaper</p>
              <div className="flex gap-2 overflow-x-auto">
                {WALLPAPERS.map(wp => (
                  <button key={wp.label} onClick={() => handleWallpaper(wp.value)}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl ${room?.wallpaper === wp.value ? 'ring-2 ring-pink-400 ring-offset-1' : ''}`}
                    style={{ background: wp.value }} />
                ))}
              </div>
            </div>

            {/* Avatar picker */}
            <div className="glass-card p-3">
              <p className="text-xs text-gray-500 font-semibold mb-2">🧑 Your Avatar</p>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => api.patch('/room', isUserA ? { avatarA: a } : { avatarB: a }).then(r => setRoom(r.data.room))}
                    className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center ${(isUserA ? room?.avatarA : room?.avatarB) === a ? 'bg-pink-100 ring-1 ring-pink-400' : 'bg-gray-50'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers */}
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-semibold">✨ Decorate</p>
                <button onClick={() => setShowDecor(s => !s)} className="text-xs text-pink-400">{showDecor ? 'Close' : 'Add Sticker'}</button>
              </div>
              <AnimatePresence>
                {showDecor && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="grid grid-cols-6 gap-2">
                      {STICKERS.map(s => (
                        <button key={s} onClick={() => handleAddDecor(s)} className="text-2xl active:scale-90 transition-transform">{s}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* PHOTOS TAB */}
        {tab === 'photos' && (
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{room?.photos?.length || 0} photos in your room</p>
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-full text-white text-xs" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                + Add Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
            </div>
            {room?.photos?.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm">No photos yet — add your memories!</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {room?.photos?.map((photo, i) => (
                <motion.div key={i} whileTap={{ scale: 0.97 }} className="rounded-2xl overflow-hidden relative shadow-card">
                  <img src={photo.url} className="w-full aspect-square object-cover" />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <p className="text-white text-xs">{photo.caption}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* VIDEO TAB */}
        {tab === 'video' && (
          <div className="px-4 pt-3 space-y-4">
            <div className="glass-card p-4">
              <p className="text-sm font-semibold text-pink-500 mb-2">🎬 Watch Together</p>
              <p className="text-xs text-gray-400 mb-3">Paste a YouTube or video URL to watch in sync</p>
              <div className="flex gap-2">
                <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..." className="flex-1 px-3 py-2 text-sm rounded-xl border border-pink-200 outline-none" />
                <button onClick={handleSetVideo} className="px-3 py-2 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Set</button>
              </div>
            </div>
            {room?.currentVideo?.url && (
              <div className="glass-card p-4">
                <p className="text-xs text-gray-400 mb-2">Now playing: {room.currentVideo.title}</p>
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  {room.currentVideo.url.includes('youtube') ? (
                    <iframe src={room.currentVideo.url.replace('watch?v=', 'embed/')}
                      className="w-full h-full" allowFullScreen />
                  ) : (
                    <video src={room.currentVideo.url} controls className="w-full h-full" />
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => sendAnimation('hug')} className="flex-1 py-2 rounded-xl text-sm border border-pink-200 text-pink-500">🤗 Hug</button>
                  <button onClick={() => sendAnimation('kiss')} className="flex-1 py-2 rounded-xl text-sm border border-pink-200 text-pink-500">💋 Kiss</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
