import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStatusStore } from '../../store/statusStore'
import { useAuthStore } from '../../store/authStore'
import StatusRing from './StatusRing'
import StatusViewer from './StatusViewer'
import StatusUploader from './StatusUploader'

export default function StatusBar() {
  const { statusGroups, fetchFeed, isLoading } = useStatusStore()
  const { user } = useAuthStore()

  const [viewerOpen, setViewerOpen]   = useState(false)
  const [startGroup, setStartGroup]   = useState(0)
  const [uploaderOpen, setUploaderOpen] = useState(false)

  useEffect(() => { fetchFeed() }, [])

  // Separate own group from others
  const myGroup    = statusGroups.find(g => g.user._id?.toString() === user._id?.toString())
  const otherGroups = statusGroups.filter(g => g.user._id?.toString() !== user._id?.toString())

  const openViewer = (group) => {
    // Build ordered list: my group first (if exists), then others
    const allGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups
    const idx = allGroups.findIndex(g => g.user._id?.toString() === group.user._id?.toString())
    setStartGroup(Math.max(0, idx))
    setViewerOpen(true)
  }

  // All groups in display order for the viewer
  const allGroupsOrdered = myGroup ? [myGroup, ...otherGroups] : otherGroups

  if (!isLoading && statusGroups.length === 0 && !user) return null

  return (
    <>
      <div className="px-3 py-2 border-b border-chat-border">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin" style={{ scrollbarWidth: 'none' }}>
          {/* My status */}
          <StatusRing
            user={user}
            isOwn
            hasUnread={false}
            onClick={() => {
              if (myGroup) openViewer(myGroup)
              else setUploaderOpen(true)
            }}
          />

          {/* Others */}
          {otherGroups.map(g => (
            <StatusRing
              key={g.user._id}
              user={g.user}
              hasUnread={g.hasUnread}
              onClick={() => openViewer(g)}
            />
          ))}

          {isLoading && (
            <div className="flex items-center px-2">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Uploader modal */}
      <AnimatePresence>
        {uploaderOpen && <StatusUploader onClose={() => { setUploaderOpen(false); fetchFeed() }} />}
      </AnimatePresence>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {viewerOpen && allGroupsOrdered.length > 0 && (
          <StatusViewer
            groups={allGroupsOrdered}
            startGroupIndex={startGroup}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
