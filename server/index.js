const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/uploads');
const pushRoutes = require('./routes/push');
const statusRoutes = require('./routes/status');
const turnRoutes = require('./routes/turn');
const lettersRoutes = require('./routes/letters');
const memoriesRoutes = require('./routes/memories');
const coupleRoutes = require('./routes/couple');

const { initializeSocket } = require('./sockets/socketHandler');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

const app = express();

/* IMPORTANT for Render / Vercel */
app.set('trust proxy', 1);

const server = http.createServer(app);

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

/* ================= SECURITY ================= */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    credentials: true,
  })
);

/* ================= BODY PARSER ================= */

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ================= LOGGER ================= */

app.use(morgan('dev'));

/* ================= RATE LIMIT ================= */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);

/* ================= ROUTES ================= */

app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/couple', coupleRoutes);

/* ================= HEALTH CHECK ================= */

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'Couple Chat',
    timestamp: new Date().toISOString(),
  });
});

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

/* ================= SOCKET INIT ================= */

initializeSocket(io);

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Connecting DB...');
    await connectDB();

    console.log('Connecting Redis...');
    await connectRedis();

    server.listen(PORT, () => {
      console.log(`🚀 Couple Chat Server running on port ${PORT}`);
      console.log(`🌍 Client URL: ${process.env.CLIENT_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io };