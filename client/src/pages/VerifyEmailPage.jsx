import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        {status === 'loading' && (
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
            <h2 className="text-xl font-bold text-chat-text">Email Verified!</h2>
            <p className="text-chat-textSecondary mt-2 mb-6">Your account is now verified.</p>
            <Link to="/login" className="btn-primary">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✗</div>
            <h2 className="text-xl font-bold text-chat-text">Verification Failed</h2>
            <p className="text-chat-textSecondary mt-2 mb-6">Link may be expired or invalid.</p>
            <Link to="/login" className="btn-primary">Go to Login</Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
