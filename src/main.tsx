// Mitigate environments (e.g. sandboxed iframes, browser extensions, or test runners) 
// where window.fetch is read-only but some third-party libraries attempt to assign/override it.
try {
  if (typeof window !== 'undefined' && 'fetch' in window) {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return currentFetch;
      },
      set(v) {
        currentFetch = v;
      }
    });
  }
} catch (e) {
  console.warn('Could not define configurable window.fetch:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the PWA service worker for complete offline compatibility and static caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('BabyPulse Service Worker successfully registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('BabyPulse Service Worker registration failed:', error);
      });
  });
}

