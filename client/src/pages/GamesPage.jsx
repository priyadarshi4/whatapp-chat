import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

/* ───── Couple Truth or Dare ───── */
const TRUTHS = [
  "What's your favourite memory of us together?",
  "What was your first impression of me?",
  "What's one thing you wish I knew about you?",
  "What's a dream you've never told me?",
  "What's the most romantic thing I've ever done?",
  "When did you first realise you liked me?",
  "What's your love language?",
  "What's your favourite thing about our relationship?",
  "What song reminds you of us?",
  "What's something that always makes you smile about me?",
];
const DARES = [
  "Send me your most embarrassing photo! 😅",
  "Call me and sing your favourite song 🎵",
  "Write me a 3-line poem right now 📝",
  "Tell me 3 things you love about me ❤️",
  "Send me a voice note saying how much you miss me",
  "Pick a nickname for me and use it all day 🌸",
  "Send a selfie making the silliest face 🤪",
  "Tell me your biggest wish for us in 2025",
  "Describe our wedding in 3 sentences 💍",
  "Send a virtual hug with 10 heart emojis 💕",
];

function TruthOrDare() {
  const [mode, setMode] = useState(null); // 'truth' | 'dare'
  const [card, setCard] = useState(null);
  const [flipped, setFlipped] = useState(false);

  const pick = (m) => {
    setMode(m);
    const arr = m === 'truth' ? TRUTHS : DARES;
    setCard(arr[Math.floor(Math.random() * arr.length)]);
    setFlipped(false);
    setTimeout(() => setFlipped(true), 50);
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-gray-400">Take turns picking — be honest! 💕</p>
      <div className="flex gap-3">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => pick('truth')}
          className="flex-1 py-4 rounded-2xl font-display font-bold text-white text-lg shadow-md"
          style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
          💬 Truth
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => pick('dare')}
          className="flex-1 py-4 rounded-2xl font-display font-bold text-white text-lg shadow-md"
          style={{ background: 'linear-gradient(135deg,#8B5CF6,#CDB4DB)' }}>
          🎯 Dare
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {card && (
          <motion.div key={card} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-3xl p-6 text-center shadow-lg ${mode === 'truth' ? 'bg-gradient-to-br from-pink-50 to-pink-100' : 'bg-gradient-to-br from-purple-50 to-purple-100'}`}>
            <div className="text-3xl mb-3">{mode === 'truth' ? '💬' : '🎯'}</div>
            <p className="text-gray-700 font-medium text-base leading-relaxed">{card}</p>
            <button onClick={() => pick(mode)} className="mt-4 px-5 py-2 rounded-full text-sm text-white" style={{ background: mode === 'truth' ? 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' : 'linear-gradient(135deg,#8B5CF6,#CDB4DB)' }}>
              Next →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───── Would You Rather ───── */
const WYR_QUESTIONS = [
  { a: "Hug for 10 minutes", b: "Kiss for 5 seconds" },
  { a: "Never fight again", b: "Always make up perfectly" },
  { a: "Weekend trip surprise", b: "Cozy night-in with movies" },
  { a: "Write letters daily", b: "Video call every evening" },
  { a: "Cook dinner together", b: "Order your fav takeout" },
  { a: "Sunrise hike together", b: "Sleep in til noon" },
  { a: "Dance in the rain", b: "Cuddle by the fireplace" },
  { a: "Travel the world", b: "Build a cozy home" },
];

function WouldYouRather() {
  const [q, setQ] = useState(WYR_QUESTIONS[0]);
  const [chosen, setChosen] = useState(null);
  const [idx, setIdx] = useState(0);

  const next = () => {
    const nextIdx = (idx + 1) % WYR_QUESTIONS.length;
    setIdx(nextIdx); setQ(WYR_QUESTIONS[nextIdx]); setChosen(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-gray-400 font-medium">Would you rather...? 💭</p>
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-5 space-y-3">
        {[q.a, q.b].map((opt, i) => (
          <motion.button key={opt} whileTap={{ scale: 0.97 }} onClick={() => setChosen(i)}
            className={`w-full py-4 px-5 rounded-2xl text-left font-medium transition-all ${chosen === i ? 'text-white shadow-lg' : 'bg-white text-gray-700 border border-pink-100'}`}
            style={chosen === i ? { background: i === 0 ? 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' : 'linear-gradient(135deg,#8B5CF6,#CDB4DB)' } : {}}>
            {i === 0 ? '💗 ' : '💜 '}{opt}
          </motion.button>
        ))}
      </div>
      {chosen !== null && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-pink-500 font-medium">
          You chose: {chosen === 0 ? q.a : q.b} 💕
        </motion.div>
      )}
      <button onClick={next} className="w-full py-3 rounded-2xl text-pink-500 border border-pink-200 font-medium text-sm active:scale-95 transition-transform">
        Next Question →
      </button>
    </div>
  );
}

/* ───── Couple Quiz ───── */
const QUIZ = [
  { q: "What's my favourite colour?", opts: ["Pink", "Blue", "Purple", "Red"], hint: "Think about what I wear most!" },
  { q: "Where would I most love to travel?", opts: ["Paris 🗼", "Bali 🌴", "Tokyo 🏯", "NYC 🗽"], hint: "I've mentioned it before..." },
  { q: "What's my comfort food?", opts: ["Pizza", "Ice cream", "Biryani", "Chocolate"], hint: "What do I reach for when sad?" },
  { q: "My love language is?", opts: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service"], hint: "How do I show love?" },
  { q: "If I could have a superpower?", opts: ["Time travel", "Mind reading", "Flying", "Invisibility"], hint: "Think about what I'd use it for..." },
];

function CoupleQuiz() {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUIZ[qi];

  const pick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    // All answers are "correct" — it's a discussion game, not a test
    setScore(s => s + 1);
    setTimeout(() => {
      if (qi < QUIZ.length - 1) { setQi(qi + 1); setSelected(null); }
      else setDone(true);
    }, 1200);
  };

  const reset = () => { setQi(0); setSelected(null); setScore(0); setDone(false); };

  if (done) return (
    <div className="text-center py-6">
      <div className="text-5xl mb-3">🎉</div>
      <h3 className="font-display text-xl text-pink-500 font-bold">Quiz Complete!</h3>
      <p className="text-gray-500 mt-2 text-sm">Discuss your answers together 💕</p>
      <p className="text-gray-400 text-xs mt-1">How well do you really know each other?</p>
      <button onClick={reset} className="mt-4 px-6 py-3 rounded-full text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Play Again</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{qi + 1} / {QUIZ.length}</span>
        <div className="flex gap-1">{QUIZ.map((_, i) => <div key={i} className={`w-6 h-1.5 rounded-full ${i <= qi ? 'bg-pink-400' : 'bg-gray-200'}`} />)}</div>
      </div>
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-5">
        <p className="text-xs text-pink-400 mb-2 font-medium">💭 {q.hint}</p>
        <p className="text-gray-800 font-semibold text-base">{q.q}</p>
      </div>
      <div className="space-y-2">
        {q.opts.map((opt, i) => (
          <motion.button key={opt} whileTap={{ scale: 0.97 }} onClick={() => pick(i)}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-all ${selected !== null ? (i === selected ? 'text-white' : 'opacity-50 bg-gray-50 text-gray-400') : 'bg-white border border-pink-100 text-gray-700 active:border-pink-400'}`}
            style={selected === i ? { background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' } : {}}>
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ───── Puzzle Board ───── */
function PuzzleBoard({ game, onMove }) {
  const [selected, setSelected] = useState(null);
  const gridSize = game.gridSize || 3;
  const pieces = [...game.pieces].sort((a, b) => a.currentPos - b.currentPos);

  const handleTap = (piece) => {
    if (selected === null) { setSelected(piece.id); return; }
    if (selected === piece.id) { setSelected(null); return; }
    onMove(selected, piece.currentPos);
    setSelected(null);
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
            style={{ aspectRatio: '1' }}>
            <div style={{
              backgroundImage: `url(${game.imageUrl})`, backgroundSize: `${gridSize * 100}%`,
              backgroundPosition: `${col * pct / (1 - 1 / gridSize)}% ${row * pct / (1 - 1 / gridSize)}%`,
              width: '100%', height: '100%', backgroundRepeat: 'no-repeat',
            }} />
            {piece.currentPos === piece.correctPos && (
              <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center">
                <span className="text-green-600 font-bold text-xs">✓</span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN GAMES PAGE
═══════════════════════════════════════ */
export default function GamesPage() {
  const [activeGame, setActiveGame] = useState('menu'); // menu | tod | wyr | quiz | puzzle
  const [puzzle, setPuzzle] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [solved, setSolved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/games/current').then(({ data }) => { if (data.game) setPuzzle(data.game); }).catch(() => {});
  }, []);

  const handleImageSelect = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const createPuzzle = async () => {
    if (!imgPreview) return; setCreating(true);
    try {
      const { data: up } = await api.post('/upload', { data: imgPreview, type: 'image' });
      const { data } = await api.post('/games/puzzle', { imageUrl: up.url, gridSize: 3 });
      setPuzzle(data.game); setImgPreview(null);
    } catch (_) {} finally { setCreating(false); }
  };

  const movePiece = async (pieceId, toPos) => {
    if (!puzzle) return;
    try {
      const { data } = await api.patch(`/games/${puzzle._id}/move`, { pieceId, toPosition: toPos });
      setPuzzle(data.game);
      if (data.solved) { setSolved(true); setTimeout(() => setSolved(false), 4000); }
    } catch (_) {}
  };

  const GAMES_MENU = [
    { id: 'tod', icon: '💬', title: 'Truth or Dare', desc: 'Spicy questions & fun challenges' },
    { id: 'wyr', icon: '💭', title: 'Would You Rather', desc: 'Impossible choices for couples' },
    { id: 'quiz', icon: '🧠', title: 'Couple Quiz', desc: 'How well do you know each other?' },
    { id: 'puzzle', icon: '🧩', title: 'Photo Puzzle', desc: 'Rearrange your favourite photo' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {activeGame !== 'menu' && (
            <button onClick={() => setActiveGame('menu')} className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">‹</button>
          )}
          <h1 className="font-display text-xl font-bold text-pink-500">
            {activeGame === 'menu' ? '🎮 Couple Games' : GAMES_MENU.find(g => g.id === activeGame)?.title || '🎮'}
          </h1>
        </div>

        {/* Solved overlay */}
        <AnimatePresence>
          {solved && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                <div className="text-6xl mb-3">🎉</div>
                <h2 className="font-display text-2xl text-pink-500 font-bold">Puzzle Solved!</h2>
                <p className="text-gray-500 mt-2">You two are amazing together 💕</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MENU ── */}
        {activeGame === 'menu' && (
          <div className="grid grid-cols-2 gap-3">
            {GAMES_MENU.map(g => (
              <motion.button key={g.id} whileTap={{ scale: 0.95 }} onClick={() => setActiveGame(g.id)}
                className="glass-card p-4 text-left flex flex-col gap-2 active:shadow-sm">
                <span className="text-3xl">{g.icon}</span>
                <span className="font-semibold text-sm text-gray-800 dark:text-pink-100">{g.title}</span>
                <span className="text-xs text-gray-400 leading-tight">{g.desc}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* ── TRUTH OR DARE ── */}
        {activeGame === 'tod' && <TruthOrDare />}

        {/* ── WOULD YOU RATHER ── */}
        {activeGame === 'wyr' && <WouldYouRather />}

        {/* ── QUIZ ── */}
        {activeGame === 'quiz' && <CoupleQuiz />}

        {/* ── PUZZLE ── */}
        {activeGame === 'puzzle' && (
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            {imgPreview && !puzzle && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                <p className="text-sm font-medium text-pink-500 mb-3">Will be cut into 9 pieces 🧩</p>
                <img src={imgPreview} className="w-full rounded-xl object-cover mb-3" style={{ maxHeight: '180px' }} />
                <div className="flex gap-2">
                  <button onClick={createPuzzle} disabled={creating} className="flex-1 py-3 rounded-xl text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                    {creating ? '⏳ Creating...' : '🧩 Start Puzzle!'}
                  </button>
                  <button onClick={() => setImgPreview(null)} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500">✕</button>
                </div>
              </motion.div>
            )}

            {puzzle && puzzle.status !== 'solved' && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-pink-500">Tap two pieces to swap!</p>
                  <button onClick={() => { setPuzzle(null); setImgPreview(null); fileRef.current?.click(); }} className="text-xs text-pink-400 border border-pink-200 px-3 py-1 rounded-full">New</button>
                </div>
                <PuzzleBoard game={puzzle} onMove={movePiece} />
              </div>
            )}

            {puzzle && puzzle.status === 'solved' && (
              <div className="glass-card p-6 text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h2 className="font-display text-xl text-pink-500 font-bold">Solved!</h2>
                <img src={puzzle.imageUrl} className="w-full rounded-xl object-cover mt-4 mb-4" style={{ maxHeight: '180px' }} />
                <button onClick={() => { setPuzzle(null); fileRef.current?.click(); }} className="w-full py-3 rounded-xl text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>Play Again 🧩</button>
              </div>
            )}

            {!puzzle && !imgPreview && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🧩</div>
                <h2 className="font-display text-xl text-pink-500 font-semibold">Photo Puzzle</h2>
                <p className="text-sm text-gray-400 mt-2 mb-6">Upload a photo, it gets cut into 9 pieces — solve it together!</p>
                <button onClick={() => fileRef.current?.click()} className="px-8 py-3 rounded-full text-white font-medium" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>
                  📷 Choose Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
