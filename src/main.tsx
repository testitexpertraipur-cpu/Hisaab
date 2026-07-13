import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if this is the Google OAuth callback inside a popup window
if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const error = params.get('error');

  if (window.opener) {
    if (accessToken) {
      const expiresAt = Date.now() + parseInt(expiresIn || '3600', 10) * 1000;
      window.opener.postMessage({
        type: 'GOOGLE_OAUTH_SUCCESS',
        accessToken,
        expiresAt
      }, window.location.origin);
    } else if (error) {
      window.opener.postMessage({
        type: 'GOOGLE_OAUTH_FAILURE',
        error
      }, window.location.origin);
    }
    window.close();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for complete PWA offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => {
        console.log('Hisaab Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Hisaab Service Worker registration failed:', err);
      });
  });
}
