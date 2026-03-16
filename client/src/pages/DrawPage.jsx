import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '../utils/socket';
import useChatStore from '../store/chatStore';
import api from '../utils/api';

const COLORS = ['#FF4F8B','#CDB4DB','#FF8FB1','#60a5fa','#34d399','#fbbf24','#f87171','#000000','#ffffff'];
const SIZES = [2, 5, 10, 18];

export default function DrawPage() {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#FF4F8B');
  const [size, setSize] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const lastPos = useRef(null);
  const strokes = useRef([]);
  const { chat } = useChatStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#fff8fc';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handlers = {
      'draw:stroke': ({ stroke }) => drawStroke(stroke, false),
      'draw:clear': () => clearCanvas(false),
      'draw:undo': () => undoStroke(false),
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const drawStroke = useCallback((stroke, emit = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#fff8fc' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (emit) {
      strokes.current.push(stroke);
      const socket = getSocket();
      if (socket && chat?._id) socket.emit('draw:stroke', { chatId: chat._id, stroke });
    }
  }, [chat]);

  const handleStart = (e) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const handleMove = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e, canvasRef.current);
    const stroke = { from: lastPos.current, to: pos, color, size, tool };
    drawStroke(stroke);
    lastPos.current = pos;
  };

  const handleEnd = () => setDrawing(false);

  const clearCanvas = (emit = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff8fc';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    strokes.current = [];
    if (emit) {
      const socket = getSocket();
      if (socket && chat?._id) socket.emit('draw:clear', { chatId: chat._id });
    }
  };

  const undoStroke = (emit = true) => {
    strokes.current.pop();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff8fc';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    strokes.current.forEach(s => drawStroke(s, false));
    if (emit) {
      const socket = getSocket();
      if (socket && chat?._id) socket.emit('draw:undo', { chatId: chat._id });
    }
  };

  const saveAndSend = async () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    try {
      const { data } = await api.post('/upload', { data: dataUrl, type: 'image' });
      const chatStore = (await import('../store/chatStore')).default;
      chatStore.getState().sendMessage('🎨 Drew this for you!', 'image', { mediaUrl: data.url });
      alert('Drawing sent! 🎨💕');
    } catch (_) { alert('Could not send drawing'); }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-rose-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100 flex-shrink-0">
        <h1 className="font-display text-lg font-bold text-pink-500">🎨 Draw Together</h1>
        <div className="flex gap-2">
          <button onClick={() => undoStroke()} className="px-3 py-1.5 rounded-xl text-xs bg-gray-100 text-gray-500 active:scale-95">↩ Undo</button>
          <button onClick={() => clearCanvas()} className="px-3 py-1.5 rounded-xl text-xs bg-red-50 text-red-400 active:scale-95">🗑 Clear</button>
          <button onClick={saveAndSend} className="px-3 py-1.5 rounded-xl text-xs text-white active:scale-95" style={{ background: 'linear-gradient(135deg,#FF4F8B,#FF8FB1)' }}>📤 Send</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full touch-none"
          onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
          onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd} />
        <div className="absolute top-2 right-2 text-[10px] text-pink-300 bg-white/80 px-2 py-1 rounded-full">
          💕 Draw together in real time
        </div>
      </div>

      {/* Tools */}
      <div className="flex-shrink-0 border-t border-pink-100 p-3 space-y-2 bg-white dark:bg-rose-dark">
        {/* Colors */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1">
          <span className="text-xs text-gray-400 flex-shrink-0">Color:</span>
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setTool('pen'); }}
              className={`w-7 h-7 rounded-full flex-shrink-0 transition-transform ${color === c && tool === 'pen' ? 'ring-2 ring-offset-1 ring-pink-400 scale-110' : ''}`}
              style={{ background: c, border: c === '#ffffff' ? '1px solid #f9a8d4' : 'none' }} />
          ))}
          <button onClick={() => setTool('eraser')}
            className={`w-8 h-7 rounded-full flex-shrink-0 text-xs flex items-center justify-center border ${tool === 'eraser' ? 'border-pink-400 bg-pink-50' : 'border-gray-200'}`}>
            🧹
          </button>
        </div>
        {/* Sizes */}
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-400">Size:</span>
          {SIZES.map(s => (
            <button key={s} onClick={() => setSize(s)}
              className={`flex items-center justify-center rounded-full flex-shrink-0 transition-all ${size === s ? 'bg-pink-500' : 'bg-gray-200'}`}
              style={{ width: s * 3 + 12, height: s * 3 + 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
