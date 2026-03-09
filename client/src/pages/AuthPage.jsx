import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', coupleRole: 'user_a', relationshipStartDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FF4F8B 0%, #FF8FB1 35%, #CDB4DB 70%, #FFF1F5 100%)' }}>

      {/* Floating hearts BG */}
      {['💕','❤️','🌸','💗','✨'].map((h, i) => (
        <div key={i} className="absolute text-2xl opacity-20 pointer-events-none"
          style={{ top: `${10 + i * 18}%`, left: `${5 + i * 19}%`, animation: `float ${3+i}s ease-in-out infinite alternate` }}>
          {h}
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}
            className="text-5xl mb-3">💕</motion.div>
          <h1 className="font-display text-3xl text-white font-bold">Us</h1>
          <p className="text-white/80 text-sm mt-1">Our private little space</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
          <h2 className="font-display text-xl text-pink-500 font-semibold text-center mb-5">
            {isLogin ? 'Welcome back ❤️' : 'Join our space 🌸'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name</label>
                <input
                  type="text"
                  placeholder="Your sweet name"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 bg-cream-50 transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 bg-cream-50 transition"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 bg-cream-50 transition"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Together since</label>
                <input
                  type="date"
                  value={form.relationshipStartDate}
                  onChange={e => setForm({ ...form, relationshipStartDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm outline-none focus:border-pink-400 bg-cream-50 transition"
                />
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-2 px-4 bg-pink-50 border border-pink-200 rounded-xl text-pink-600 text-sm">
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF4F8B, #FF8FB1)' }}
            >
              {loading ? '...' : isLogin ? 'Enter Our Space ❤️' : 'Create Our Space 🌸'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            {isLogin ? "New here? " : "Already have an account? "}
            <Link to={isLogin ? '/register' : '/login'}
              className="text-pink-500 font-medium">
              {isLogin ? 'Register' : 'Login'}
            </Link>
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes float { from { transform: translateY(0); } to { transform: translateY(-20px); } }
      `}</style>
    </div>
  );
}
