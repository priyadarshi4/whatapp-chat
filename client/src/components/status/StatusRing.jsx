import React from 'react'

/**
 * Avatar with a coloured ring:
 *  - green gradient  → has unread statuses
 *  - grey ring       → all viewed
 *  - dashed ring     → own "add" button
 */
export default function StatusRing({ user, hasUnread = false, isOwn = false, size = 56, onClick }) {
  const r = size / 2
  const stroke = 2.5
  const gap = 3
  const cx = r
  const cy = r
  const radius = r - stroke - gap

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0 focus:outline-none"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG ring */}
        <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`ring-grad-${user._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#25D366" />
              <stop offset="100%" stopColor="#128C7E" />
            </linearGradient>
          </defs>
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={
              isOwn
                ? 'transparent'
                : hasUnread
                ? `url(#ring-grad-${user._id})`
                : '#3a4a54'
            }
            strokeWidth={stroke}
            strokeDasharray={isOwn ? '4 3' : 'none'}
          />
        </svg>

        {/* Avatar */}
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=2A3942&color=25D366`}
          alt={user.name}
          className="rounded-full object-cover absolute"
          style={{ inset: stroke + gap, width: size - (stroke + gap) * 2, height: size - (stroke + gap) * 2 }}
        />

        {/* "+" badge for own */}
        {isOwn && (
          <span className="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-chat-sidebar">
            +
          </span>
        )}
      </div>

      <span className="text-chat-textSecondary text-xs truncate max-w-[60px]">
        {isOwn ? 'My Status' : user.name?.split(' ')[0]}
      </span>
    </button>
  )
}
