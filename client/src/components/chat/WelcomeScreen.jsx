import React from 'react'
import { motion } from 'framer-motion'

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center chat-bg-pattern">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center px-8 max-w-md"
      >
        {/* WhatsApp-style laptop illustration */}
        <div className="w-48 h-48 mx-auto mb-8 relative">
          <svg viewBox="0 0 200 200" className="w-full h-full opacity-10">
            <rect x="20" y="40" width="160" height="100" rx="8" fill="#25D366" />
            <rect x="30" y="50" width="140" height="80" rx="4" fill="#0B141A" />
            <rect x="60" y="145" width="80" height="10" fill="#25D366" />
            <rect x="40" y="155" width="120" height="5" rx="2" fill="#25D366" />
            <circle cx="100" cy="90" r="25" fill="#25D366" opacity="0.5" />
            <path d="M88 90 L98 100 L116 80" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-chat-text mb-3">
          ChatApp Web
        </h2>
        <p className="text-chat-textSecondary text-sm leading-relaxed">
          Send and receive messages without keeping your phone online.<br />
          Use ChatApp on up to 4 linked devices and 1 phone.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-chat-textSecondary text-xs">
          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          End-to-end encrypted
        </div>
      </motion.div>
    </div>
  )
}
