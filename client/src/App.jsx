import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const MainApp = lazy(() => import('./pages/MainApp'));

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF4F8B, #CDB4DB)' }}>
    <div className="text-5xl animate-bounce mb-4">💕</div>
    <div className="font-display text-white text-2xl">Us</div>
  </div>
);

export default function App() {
  const { initialize, token, loading } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={!token ? <AuthPage mode="login" /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <AuthPage mode="register" /> : <Navigate to="/" replace />} />
          <Route path="/*" element={token ? <MainApp /> : <Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
