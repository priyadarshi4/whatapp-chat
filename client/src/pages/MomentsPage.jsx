import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

// Swipeable image gallery
function ImageGallery({ items, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const touchStart = useRef(null);

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(items.length - 1, i + 1));

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    else if (diff < -50) prev();
    touchStart.current = null;
  };

  const current = items[index];
  if (!current) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <span className="text-white text-sm">{index + 1} / {items.length}</span>
        <button onClick={onClose} className="text-white text-3xl leading-none">×</button>
      </div>
      {/* Media */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="w-full h-full flex items-center justify-center">
            {current.type === 'video' ? (
              <video src={current.url} controls className="max-w-full max-h-full" />
            ) : (
              <img src={current.url} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Dots + arrows */}
      <div className="p-4 flex items-center justify-center gap-4 flex-shrink-0">
        <button onClick={prev} disabled={index === 0} className="text-white text-2xl disabled:opacity-30">‹</button>
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
          ))}
        </div>
        <button onClick={next} disabled={index === items.length - 1} className="text-white text-2xl disabled:opacity-30">›</button>
      </div>
    </motion.div>
  );
}

export default function MomentsPage() {
  const { user } = useAuthStore();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [gallery, setGallery] = useState(null); // { items, startIndex }

  useEffect(() => { loadMoments(); }, []);

  const loadMoments = async () => {
    try {
      const { data } = await api.get('/status');
      setStatuses(data.statuses);
    } catch (_) {} finally { setLoading(false); }
  };

  const handleCreate = async (form) => {
    try {
      await api.post('/status', form);
      setCreating(false);
      loadMoments();
    } catch (_) {}
  };

  const handleReact = async (statusId, emoji) => {
    try {
      await api.patch(`/status/${statusId}/react`, { emoji });
      loadMoments();
    } catch (_) {}
  };

  const handleDelete = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      loadMoments();
    } catch (_) {}
  };

  const myMoments = statuses.filter(s => s.userId?._id === user?._id);
  const partnerMoments = statuses.filter(s => s.userId?._id !== user?._id);

  const getMediaItems = (status) => {
    const items = [];
    if (status.mediaItems?.length) return status.mediaItems;
    if (status.imageUrl) return [{ url: status.imageUrl, type: 'image' }];
    return items;
  };

  return (
    // FEATURE 5: Full mobile scroll
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="px-4 pt-4 pb-24 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold text-pink-500">🌸 Moments</h1>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-full text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>
            + Moment
          </motion.button>
        </div>

        {/* My moments row */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Moments</h3>
          {loading ? <div className="skeleton h-24 rounded-2xl" /> : (
            myMoments.length === 0 ? (
              <button onClick={() => setCreating(true)}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-300 gap-1">
                <span className="text-2xl">+</span>
                <span className="text-xs">Share a moment</span>
              </button>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {myMoments.map(s => {
                  const items = getMediaItems(s);
                  return (
                    <MomentCard key={s._id} status={s} isMine={true}
                      onClick={() => items.length ? setGallery({ items, startIndex: 0 }) : null}
                      onDelete={() => handleDelete(s._id)} />
                  );
                })}
              </div>
            )
          )}
        </section>

        {/* Partner moments */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Their Moments</h3>
          {loading ? <div className="skeleton h-24 rounded-2xl" /> : (
            partnerMoments.length === 0 ? (
              <div className="text-center py-8 text-gray-300 text-sm">No moments yet 🌸</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {partnerMoments.map(s => {
                  const items = getMediaItems(s);
                  return (
                    <MomentCard key={s._id} status={s} isMine={false}
                      onClick={() => items.length ? setGallery({ items, startIndex: 0 }) : null}
                      onReact={(emoji) => handleReact(s._id, emoji)} />
                  );
                })}
              </div>
            )
          )}
        </section>

        {/* Photo timeline grid */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Photo Timeline</h3>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton aspect-square rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {statuses.flatMap(s => getMediaItems(s).filter(m => m.type !== 'video' || m.type === 'image')).map((item, idx) => (
                <motion.div key={idx} whileTap={{ scale: 0.95 }}
                  onClick={() => setGallery({ items: [item], startIndex: 0 })}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-pink-100 relative">
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs ml-0.5">▶</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={item.url} className="w-full h-full object-cover" alt="moment" />
                  )}
                </motion.div>
              ))}
            </div>
          )}
          {!loading && statuses.flatMap(s => getMediaItems(s)).length === 0 && (
            <div className="text-center py-8 text-gray-300 text-sm">No photos yet 📸</div>
          )}
        </section>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {creating && <CreateMoment onClose={() => setCreating(false)} onCreate={handleCreate} />}
      </AnimatePresence>

      {/* Gallery fullscreen */}
      <AnimatePresence>
        {gallery && <ImageGallery items={gallery.items} startIndex={gallery.startIndex} onClose={() => setGallery(null)} />}
      </AnimatePresence>
    </div>
  );
}

const MomentCard = ({ status, isMine, onClick, onDelete, onReact }) => {
  const items = status.mediaItems?.length ? status.mediaItems
    : status.imageUrl ? [{ url: status.imageUrl, type: 'image' }]
    : [];
  const firstMedia = items[0];

  return (
    <motion.div whileTap={{ scale: 0.95 }} onClick={onClick}
      className="flex-shrink-0 w-20 cursor-pointer">
      <div className="w-20 h-24 rounded-2xl overflow-hidden relative shadow-card"
        style={!firstMedia ? { background: status.backgroundColor || 'linear-gradient(135deg, #FF4F8B, #CDB4DB)' } : {}}>
        {firstMedia ? (
          firstMedia.type === 'video' ? (
            <>
              <video src={firstMedia.url} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="text-white text-[8px] ml-0.5">▶</span>
                </div>
              </div>
            </>
          ) : (
            <img src={firstMedia.url} className="w-full h-full object-cover" alt="" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <p className="text-white text-[9px] text-center font-medium leading-tight">{status.content?.substring(0, 40)}</p>
          </div>
        )}

        {/* Multiple images indicator */}
        {items.length > 1 && (
          <div className="absolute top-1 right-1 bg-black/50 rounded text-white text-[8px] px-1">+{items.length}</div>
        )}

        {isMine && (
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/40 text-white text-[8px] flex items-center justify-center">
            ×
          </button>
        )}
      </div>

      {/* Reactions */}
      {!isMine && (
        <div className="flex gap-1 mt-1 justify-center">
          {['❤️', '🌸'].map(emoji => (
            <button key={emoji} onClick={(e) => { e.stopPropagation(); onReact?.(emoji); }}
              className="text-sm active:scale-90 transition-transform">{emoji}</button>
          ))}
        </div>
      )}

      <div className="text-[9px] text-center text-gray-400 mt-0.5 truncate">{status.userId?.username || ''}</div>
    </motion.div>
  );
};

// FEATURE 4: Create moment with multiple image upload
function CreateMoment({ onClose, onCreate }) {
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#FF4F8B');
  const [mediaFiles, setMediaFiles] = useState([]); // [{dataUrl, type}]
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        setMediaFiles(prev => [...prev, { dataUrl: ev.target.result, type: mediaType, name: file.name }]);
        setType(mediaType === 'video' ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (idx) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setUploading(true);
    try {
      let mediaItems = [];
      if (mediaFiles.length > 0) {
        mediaItems = await Promise.all(mediaFiles.map(async (f) => {
          try {
            const { data } = await api.post('/upload', { data: f.dataUrl, type: f.type });
            return { url: data.url, type: f.type, thumbnail: data.thumbnail };
          } catch (_) {
            return { url: f.dataUrl, type: f.type };
          }
        }));
      }

      await onCreate({
        type: mediaFiles.length > 0 ? (mediaFiles[0].type === 'video' ? 'video' : 'image') : type,
        content,
        backgroundColor: bgColor,
        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
        imageUrl: mediaItems[0]?.url,
      });
    } catch (_) {} finally { setUploading(false); }
  };

  const bgColors = ['#FF4F8B', '#CDB4DB', '#FF8FB1', '#8B5CF6', '#F472B6'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-rose-dark w-full rounded-t-3xl flex flex-col h-[90vh]">
          {/* Fixed header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <h2 className="font-display text-lg text-pink-500 font-semibold">Share a Moment 🌸</h2>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 overscroll-contain">
            

          {/* Type selector */}
          <div className="flex gap-2">
            {[['text', '✍️ Text'], ['image', '📷 Photo']].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === val ? 'text-white' : 'bg-pink-50 text-pink-400 border border-pink-200'}`}
                style={type === val ? { background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' } : {}}>{label}</button>
            ))}
          </div>

          {/* Media upload */}
          <div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFilesSelect} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-pink-200 text-pink-400 text-sm flex items-center justify-center gap-2">
              <span>📷</span> Add Photos / Videos
            </button>
          </div>

          {/* Media preview grid */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaFiles.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-pink-50">
                  {f.type === 'video'
                    ? <video src={f.dataUrl} className="w-full h-full object-cover" />
                    : <img src={f.dataUrl} className="w-full h-full object-cover" alt="" />}
                  <button onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-pink-200 flex items-center justify-center text-2xl text-pink-300">
                +
              </button>
            </div>
          )}

          {/* Caption/text */}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Share what's on your mind... 💕" rows={3}
            className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none resize-none" />

          {/* Background color (for text moments) */}
          {mediaFiles.length === 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 flex-shrink-0">Background:</span>
              {bgColors.map(c => (
                <button key={c} onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 transition-transform ${bgColor === c ? 'ring-2 ring-offset-2 ring-pink-400 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          )}

          </div>
        {/* Fixed footer - always visible */}
        <div className="sticky bottom-0 px-5 pt-3 border-t border-pink-100 bg-white dark:bg-rose-dark pb-8">
          <button onClick={handleSubmit}
            disabled={uploading || (!content && mediaFiles.length === 0)}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}>
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40 20" />
                </svg>
                Sharing...
              </span>
            ) : 'Share Moment 🌸'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
