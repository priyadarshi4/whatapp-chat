import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error('Failed to send reset email')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-chat-header rounded-2xl p-8 shadow-2xl">
          <Link to="/login" className="flex items-center gap-2 text-chat-textSecondary hover:text-chat-text mb-6">
            <FiArrowLeft /> Back to login
          </Link>
          <h2 className="text-xl font-bold text-chat-text mb-2">Forgot Password</h2>
          <p className="text-chat-textSecondary text-sm mb-6">Enter your email to receive a reset link</p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMail className="text-primary-500 text-2xl" />
              </div>
              <p className="text-chat-text font-medium">Check your email</p>
              <p className="text-chat-textSecondary text-sm mt-2">If that email exists, a reset link was sent.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="input-field pl-10" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ForgotPasswordPage
