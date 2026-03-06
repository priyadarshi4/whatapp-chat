import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => socket

export const initSocket = (token) => {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    withCredentials: true
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