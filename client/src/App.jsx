import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AuthPage from './pages/AuthPage';
import MainApp from './pages/MainApp';

function App() {
  const { token, loading, initialize } = useAuthStore();
  useEffect(() => { initialize(); }, []);
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-cream-100 dark:bg-rose-dark">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">💕</div>
        <p className="text-pink-400 text-sm font-medium">Loading our world...</p>
      </div>
    </div>
  );
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <AuthPage mode="login" /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <AuthPage mode="register" /> : <Navigate to="/" />} />
        <Route path="/*" element={token ? <MainApp /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
