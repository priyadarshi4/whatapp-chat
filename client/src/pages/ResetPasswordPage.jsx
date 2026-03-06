import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await api.post(`/auth/reset-password/${token}`, { password })
      setDone(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-chat-header rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-chat-text mb-2">Reset Password</h2>
          {done ? (
            <div className="text-center py-4">
              <p className="text-chat-text">Password reset successfully!</p>
              <Link to="/login" className="btn-primary inline-block mt-4">Go to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="input-field pl-10" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
