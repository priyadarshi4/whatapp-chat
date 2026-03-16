import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

export default function GamesPage() {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [solved, setSolved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadGame(); }, []);

  const loadGame = async () => {
    try {
      const { data } = await api.get('/games/current');
      setGame(data.game);
    } catch (_) {} finally { setLoading(false); }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreatePuzzle = async () => {
    if (!imgPreview) return;
    setCreating(true);
    try {
      const { data: upData } = await api.post('/upload', { data: imgPreview, type: 'image' });
      const { data } = await api.post('/games/puzzle', { imageUrl: upData.url, gridSize: 3 });
      setGame(data.game);
      setImgPreview(null);
    } catch (_) {} finally { setCreating(false); }
  };

  const handleMove = async (pieceId, toPosition) => {
    if (!game || game.status === 'solved') return;
    try {
      const { data } = await api.patch(`/games/${game._id}/move`, { pieceId, toPosition });
      setGame(data.game);
      if (data.solved) { setSolved(true); setTimeout(() => setSolved(false), 4000); }
    } catch (_) {}
  };

  const [draggingPiece, setDraggingPiece] = useState(null);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-3xl animate-pulse">🧩</div></div>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold text-pink-500">🎮 Couple Games</h1>
          {!game && (
            <button onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
              + New Puzzle
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        {/* Solved celebration */}
        <AnimatePresence>
          {solved && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                <div className="text-6xl mb-3">🎉</div>
                <h2 className="font-display text-2xl text-pink-500 font-bold">Puzzle Solved!</h2>
                <p className="text-gray-500 mt-2">You two are amazing together 💕</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image preview to create puzzle */}
        {imgPreview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-4">
            <p className="text-sm font-medium text-pink-500 mb-3">📷 Preview — will be cut into 9 pieces</p>
            <img src={imgPreview} className="w-full rounded-xl object-cover mb-3" style={{ maxHeight: '200px' }} />
            <div className="flex gap-2">
              <button onClick={handleCreatePuzzle} disabled={creating}
                className="flex-1 py-3 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                {creating ? '⏳ Creating...' : '🧩 Create Puzzle!'}
              </button>
              <button onClick={() => setImgPreview(null)} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500">✕</button>
            </div>
          </motion.div>
        )}

        {/* Active puzzle */}
        {game && game.status !== 'solved' && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-pink-500">🧩 Couple Puzzle</p>
              <p className="text-xs text-gray-400">Tap two pieces to swap them!</p>
            </div>
            <PuzzleBoard game={game} onMove={handleMove} />
            <button onClick={() => { setGame(null); fileRef.current?.click(); }}
              className="w-full mt-3 py-2 rounded-xl text-xs text-pink-400 border border-pink-200">New Puzzle</button>
          </div>
        )}

        {game && game.status === 'solved' && (
          <div className="glass-card p-6 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="font-display text-xl text-pink-500 font-bold">Puzzle Completed!</h2>
            <img src={game.imageUrl} className="w-full rounded-xl object-cover mt-4" style={{ maxHeight: '200px' }} />
            <button onClick={() => { setGame(null); fileRef.current?.click(); }}
              className="mt-4 w-full py-3 rounded-xl text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
              Play Again 🧩
            </button>
          </div>
        )}

        {!game && !imgPreview && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🧩</div>
            <h2 className="font-display text-xl text-pink-500 font-semibold">Couple Puzzle</h2>
            <p className="text-sm text-gray-400 mt-2 mb-6">Upload a photo, break it into pieces,<br/>and solve it together!</p>
            <button onClick={() => fileRef.current?.click()}
              className="px-8 py-3 rounded-full text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
              📷 Choose a Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PuzzleBoard({ game, onMove }) {
  const [selected, setSelected] = useState(null);
  const gridSize = game.gridSize || 3;
  const pieces = [...game.pieces].sort((a, b) => a.currentPos - b.currentPos);

  const handleTap = (piece) => {
    if (selected === null) {
      setSelected(piece.id);
    } else if (selected === piece.id) {
      setSelected(null);
    } else {
      onMove(selected, piece.currentPos);
      setSelected(null);
    }
  };

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, aspectRatio: '1' }}>
      {pieces.map((piece) => {
        const row = Math.floor(piece.correctPos / gridSize);
        const col = piece.correctPos % gridSize;
        const pct = 100 / gridSize;
        return (
          <motion.button key={piece.id} whileTap={{ scale: 0.95 }} onClick={() => handleTap(piece)}
            className={`rounded-lg overflow-hidden relative ${selected === piece.id ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
            style={{ aspectRatio: '1', background: '#f9a8d4' }}>
            <div style={{
              backgroundImage: `url(${game.imageUrl})`,
              backgroundSize: `${gridSize * 100}%`,
              backgroundPosition: `${col * pct / (1 - 1 / gridSize)}% ${row * pct / (1 - 1 / gridSize)}%`,
              width: '100%', height: '100%', backgroundRepeat: 'no-repeat',
            }} />
            {piece.currentPos === piece.correctPos && (
              <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center">
                <span className="text-green-500 text-xs">✓</span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
