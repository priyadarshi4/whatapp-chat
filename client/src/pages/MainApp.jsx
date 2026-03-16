import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { getSocket } from '../utils/socket';
import BottomNav from '../components/shared/BottomNav';
import FloatingHearts from '../components/shared/FloatingHearts';

const ChatPage = lazy(() => import('./ChatPage'));
const MomentsPage = lazy(() => import('./MomentsPage'));
const LovePage = lazy(() => import('./LovePage'));
const LettersPage = lazy(() => import('./LettersPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const DrawPage = lazy(() => import('./DrawPage'));
const GamesPage = lazy(() => import('./GamesPage'));
const RoomPage = lazy(() => import('./RoomPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-3xl animate-pulse">💕</div>
  </div>
);

export default function MainApp() {
  const location = useLocation();
  const { user, setPartnerOnline, setPartnerMood } = useAuthStore();
  const { loadChat, addMessage, setTyping, updateMessageReactions, updateMessagePin, chat, updateDeliveryBulk, markRead, deleteMessage, incrementUnread } = useChatStore();
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [missYouAlert, setMissYouAlert] = useState(null);
  const [hugAlert, setHugAlert] = useState(null);

  useEffect(() => { loadChat(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (chat?._id) socket.emit('chat:join', chat._id);

    const handlers = {
      'message:new': (msg) => {
        if (msg.senderId?._id !== user?._id) {
          addMessage(msg);
          incrementUnread();
          if (msg.type === 'miss_you') triggerFloatingHearts();
          if (location.pathname === '/') socket.emit('message:read', { chatId: msg.chatId });
        }
      },
      'message:deleted': ({ messageId, deleteFor }) => deleteMessage(messageId, deleteFor),
      'message:read_bulk': ({ readBy }) => { if (readBy !== user?._id) updateDeliveryBulk('read'); },
      'message:delivered_bulk': () => updateDeliveryBulk('delivered'),
      'typing:start': ({ userId }) => { if (userId !== user?._id) setTyping(userId, true); },
      'typing:stop': ({ userId }) => { if (userId !== user?._id) setTyping(userId, false); },
      'user:online': ({ userId, isOnline, lastSeen }) => { if (userId !== user?._id) setPartnerOnline(isOnline, lastSeen); },
      'mood:updated': ({ userId, mood }) => { if (userId !== user?._id) setPartnerMood(mood); },
      'message:reacted': ({ messageId, reactions }) => updateMessageReactions(messageId, reactions),
      'message:pinned': ({ messageId, isPinned }) => updateMessagePin(messageId, isPinned),
      'miss_you': ({ from }) => {
        triggerFloatingHearts();
        setMissYouAlert(from?.username || 'They');
        setTimeout(() => setMissYouAlert(null), 3500);
      },
      'receive:hug': ({ from }) => {
        setHugAlert(from?.username || 'They');
        setTimeout(() => setHugAlert(null), 3000);
        triggerFloatingHearts();
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, [chat?._id, user?._id, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/' && chat?._id) {
      const socket = getSocket();
      if (socket) socket.emit('message:read', { chatId: chat._id });
      markRead();
    }
  }, [location.pathname, chat?._id]);

  const triggerFloatingHearts = () => {
    const hearts = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i, x: 15 + Math.random() * 70,
      emoji: ['💕','❤️','🌸','💗','✨'][Math.floor(Math.random() * 5)],
    }));
    setFloatingHearts(prev => [...prev, ...hearts]);
    setTimeout(() => setFloatingHearts([]), 2500);
  };

  const isChatPage = location.pathname === '/';

  return (
    <div className="flex flex-col bg-cream-100 dark:bg-rose-dark" style={{ height: '100dvh' }}>
      <AnimatePresence>
        {missYouAlert && (
          <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-50 glass-card p-4 text-center text-pink-600 font-medium shadow-glow-pink">
            💕 {missYouAlert} misses you!
          </motion.div>
        )}
        {hugAlert && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-rose-dark rounded-2xl px-6 py-4 text-center shadow-xl border border-pink-200">
            <div className="text-4xl mb-1">🤗</div>
            <p className="text-pink-500 font-medium text-sm">{hugAlert} is hugging you!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingHearts hearts={floatingHearts} />

      <div className={isChatPage ? 'flex flex-col overflow-hidden' : 'flex-1 overflow-hidden'}
        style={{ paddingBottom: isChatPage ? 0 : '4rem', height: isChatPage ? 'calc(100dvh - 4rem)' : undefined }}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/moments" element={<MomentsPage />} />
            <Route path="/love" element={<LovePage />} />
            <Route path="/letters" element={<LettersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/draw" element={<DrawPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/room" element={<RoomPage />} />
          </Routes>
        </Suspense>
      </div>

      <BottomNav />
    </div>
  );
}
