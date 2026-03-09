import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import { registerPush } from './utils/push.js';

// Register push notifications after user interaction
// Will be called from auth store after login
window.__registerPush = registerPush;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
