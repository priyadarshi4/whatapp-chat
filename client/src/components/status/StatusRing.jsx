import React from 'react'

/**
 * Avatar with a coloured SVG ring:
 *  - green gradient  → hasStatus + hasUnread (unread statuses)
 *  - grey solid      → hasStatus + all viewed
 *  - dashed green    → isOwn + hasStatus (I posted something)
 *  - dashed grey     → isOwn + no statuses yet
 *  - transparent     → no statuses (contact has nothing)
 */
export default function StatusRing({ user, hasStatus = false, hasUnread = false, isOwn = false, size = 56, onClick }) {
  const stroke = 2.5
  const gap    = 3
  const r      = size / 2
  const radius = r - stroke - gap

  // Decide ring appearance
  let strokeColor  = 'transparent'
  let dashArray    = 'none'

  if (isOwn) {
    strokeColor = hasStatus ? '#25D366' : '#3a4a54'
    dashArray   = '4 3'
  } else if (hasStatus) {
    strokeColor = hasUnread ? `url(#rg-${user._id})` : '#3a4a54'
  }

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0 focus:outline-none group">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`rg-${user._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#25D366" />
              <stop offset="100%" stopColor="#128C7E" />
            </linearGradient>
          </defs>
          <circle
            cx={r} cy={r} r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
        </svg>

        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=2A3942&color=25D366`}
          alt={user.name}
          className="rounded-full object-cover absolute group-hover:brightness-90 transition-all"
          style={{ inset: stroke + gap, width: size - (stroke + gap) * 2, height: size - (stroke + gap) * 2 }}
        />

        {/* + badge for own */}
        {isOwn && (
          <span className="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-chat-sidebar z-10">
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
