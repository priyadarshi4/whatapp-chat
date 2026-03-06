import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { initSocket } from './socket/socket'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ChatPage from './pages/ChatPage'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? <Navigate to="/" replace /> : children
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) {
      initSocket(token)
      fetchMe()
    }
  }, [token])

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#2A3942',
            color: '#E9EDEF',
            border: '1px solid #374151',
          },
          duration: 3000,
        }}
      />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
