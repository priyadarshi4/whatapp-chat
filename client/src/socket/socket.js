import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => socket

export const initSocket = (token) => {
  if (socket?.connected) return socket

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
