import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return toast.error('Please fill in all fields')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')

    const result = await register(form.name, form.email, form.password)
    if (result.success) {
      toast.success('Account created! Welcome to ChatApp!')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-white fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-chat-text">Create Account</h1>
          <p className="text-chat-textSecondary mt-1">Join ChatApp today</p>
        </div>

        <div className="bg-chat-header rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary" />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full name"
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary" />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email address"
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-chat-textSecondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="Password (min 6 chars)"
                className="input-field pl-10 pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-chat-textSecondary">
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center">
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>
          <p className="text-center mt-6 text-chat-textSecondary text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
