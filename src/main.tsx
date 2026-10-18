import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { CallProvider } from './contexts/CallContext';
import { authService } from './services';
import './index.css';

// Register Service Worker for PWA installation and offline caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration warning:', err);
    });
  });
}

// Prevent browser long-press action menus, image download popups & context menus
if (typeof window !== 'undefined') {
  window.addEventListener(
    'contextmenu',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
    },
    { capture: true }
  );
}

const Root: React.FC = () => {
  const [currentUid, setCurrentUid] = useState<string | null>(() => authService.getCurrentUser()?.uid || null);

  useEffect(() => {
    return authService.onAuthStateChanged((user) => {
      setCurrentUid(user?.uid || null);
    });
  }, []);

  return (
    <ThemeProvider>
      <CallProvider currentUserId={currentUid}>
        <App />
      </CallProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
