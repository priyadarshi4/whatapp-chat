# 💬 ChatApp — Full-Stack Real-Time Chat Application

A production-grade WhatsApp Web clone built with modern scalable technologies.

---

## 🚀 Tech Stack

### Frontend
- **React.js** (Vite) — Fast, modern UI
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Smooth animations
- **Zustand** — Lightweight state management
- **Socket.io-client** — Real-time communication

### Backend
- **Node.js + Express.js** — REST API server
- **Socket.io** — WebSocket messaging
- **MongoDB + Mongoose** — Primary database
- **JWT Authentication** — Secure auth
- **Redis** — Online status & message queue (with in-memory fallback)
- **Multer + Cloudinary** — File/media uploads
- **WebRTC** — Voice note recording in browser

### Infrastructure
- **Docker + Docker Compose** — Containerized deployment
- **Nginx** — Static file serving + reverse proxy

---

## ✨ Features

### Authentication
- ✅ Register / Login / Logout
- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ Email verification
- ✅ Forgot / Reset password
- ✅ Profile setup (name, avatar, bio)

### Real-Time Messaging
- ✅ Instant message delivery via Socket.io
- ✅ Message status: ✓ Sent → ✓✓ Delivered → ✓✓ Blue (Seen)
- ✅ Typing indicator ("is typing...")
- ✅ Online / Offline status
- ✅ Last seen timestamp

### Chat Types
- ✅ One-to-one private chat
- ✅ Group chat with admin controls
- ✅ Infinite scroll for message history
- ✅ Pagination support

### Media Messaging
- ✅ Images, Videos, Documents
- ✅ Voice notes (record in browser via WebRTC/MediaRecorder API)
- ✅ Emoji picker
- ✅ File previews before sending

### Advanced Features
- ✅ Message reactions (❤️ 😂 👍 etc.)
- ✅ Message edit
- ✅ Message delete (for me / for everyone)
- ✅ Reply to specific messages
- ✅ Forward messages
- ✅ Pin chats (up to 3)
- ✅ Star messages
- ✅ Search messages within chats
- ✅ Block / Unblock users

### UI/UX
- ✅ WhatsApp-dark-themed UI
- ✅ Smooth Framer Motion animations
- ✅ Message appear animations
- ✅ Typing animation (bouncing dots)
- ✅ Mobile-responsive layout
- ✅ Optimistic UI updates

### Notifications
- ✅ Browser push notifications
- ✅ Sound notifications
- ✅ Unread message counter

---

## 📁 Project Structure

```
chat-app/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # Auth forms
│   │   │   ├── chat/          # Chat window, messages, input
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   ├── ChatHeader.jsx
│   │   │   │   ├── MessageList.jsx
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   └── WelcomeScreen.jsx
│   │   │   ├── sidebar/       # Sidebar, chat list, panels
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── ChatList.jsx
│   │   │   │   ├── SearchPanel.jsx
│   │   │   │   ├── NewChatPanel.jsx
│   │   │   │   ├── NewGroupPanel.jsx
│   │   │   │   └── ProfilePanel.jsx
│   │   │   └── ui/            # Reusable UI components
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   └── VerifyEmailPage.jsx
│   │   ├── store/
│   │   │   ├── authStore.js   # Zustand auth state
│   │   │   └── chatStore.js   # Zustand chat state
│   │   ├── socket/
│   │   │   └── socket.js      # Socket.io singleton
│   │   └── utils/
│   │       └── api.js         # Axios instance
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                    # Node.js backend
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   ├── redis.js           # Redis with in-memory fallback
│   │   └── cloudinary.js      # Cloudinary config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── chatController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   └── validate.js        # Input validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Chat.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── chats.js
│   │   ├── messages.js
│   │   └── uploads.js
│   ├── sockets/
│   │   └── socketHandler.js   # All socket events
│   ├── utils/
│   │   └── email.js           # Nodemailer
│   └── index.js               # Entry point
│
└── docker-compose.yml
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional — falls back to in-memory)
- Cloudinary account (for media storage)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Copy and edit server env
cp server/.env.example server/.env
```

Fill in your values:
```env
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_secret_key_here
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```

### 3. Run Development

```bash
# Terminal 1 — Start server
cd server
npm run dev

# Terminal 2 — Start client
cd client
npm run dev
```

App available at: **http://localhost:5173**

---

## 🐳 Docker Deployment

```bash
# Start all services (MongoDB, Redis, Server, Client)
docker-compose up -d

# View logs
docker-compose logs -f server

# Stop
docker-compose down
```

---

## 🔌 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send a new message |
| `message:received` | Server → Client | Receive a message |
| `message:seen` | Bidirectional | Mark messages as read |
| `message:delivered` | Server → Client | Message delivered |
| `message:edit` | Client → Server | Edit a message |
| `message:edited` | Server → Client | Message was edited |
| `message:delete` | Client → Server | Delete a message |
| `message:deleted` | Server → Client | Message was deleted |
| `message:react` | Client → Server | Add reaction |
| `message:reacted` | Server → Client | Reaction updated |
| `typing:start` | Client → Server | User started typing |
| `typing:stop` | Client → Server | User stopped typing |
| `typing:update` | Server → Client | Typing status changed |
| `user:online` | Server → Client | User came online |
| `user:offline` | Server → Client | User went offline |
| `chat:new` | Client → Server | New chat created |
| `chat:join` | Client → Server | Join a chat room |

---

## 🔒 Security

- JWT token authentication on all protected routes
- Bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints (20 req/15min)
- General API rate limiting (100 req/15min)
- Input validation with express-validator
- Helmet.js security headers
- XSS protection via input sanitization
- Users can only access their own chats/messages

---

## 📊 Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed)",
  "avatar": "string (URL)",
  "bio": "string",
  "isVerified": "boolean",
  "online": "boolean",
  "lastSeen": "Date",
  "pinnedChats": ["ChatId"],
  "starredMessages": ["MessageId"],
  "blockedUsers": ["UserId"]
}
```

### Chats Collection
```json
{
  "_id": "ObjectId",
  "participants": ["UserId"],
  "isGroup": "boolean",
  "groupName": "string",
  "groupAdmin": "UserId",
  "groupAvatar": "string",
  "lastMessage": "MessageId"
}
```

### Messages Collection
```json
{
  "_id": "ObjectId",
  "chatId": "ChatId",
  "senderId": "UserId",
  "message": "string",
  "messageType": "text|image|video|audio|document|system",
  "mediaUrl": "string",
  "seenBy": [{ "user": "UserId", "seenAt": "Date" }],
  "deliveredTo": [{ "user": "UserId", "deliveredAt": "Date" }],
  "reactions": [{ "emoji": "string", "users": ["UserId"] }],
  "replyTo": "MessageId",
  "isEdited": "boolean",
  "deletedForEveryone": "boolean",
  "deletedFor": ["UserId"]
}
```

---

## 📄 License

MIT — Free to use and modify.
