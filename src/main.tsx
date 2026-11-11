import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyPrefs } from './lib/prefs';
import { setupKeyboard } from './lib/keyboard';
import { startTranslator } from './lib/i18n';

applyPrefs();
setupKeyboard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Язык интерфейса (русский / English / Türkçe / العربية)
startTranslator();

// Устанавливаемое приложение (иконка на экране «Домой»)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

// На телефоне экран не масштабируется пальцами — как в настоящем приложении
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });
