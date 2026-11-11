// Личные настройки этого устройства: звук, вибрация, уведомления, размер шрифта, анимации
export interface Prefs {
  sound: boolean;
  volume: number;        // 0.1 … 1
  vibrate: boolean;
  notify: boolean;       // уведомления на экран, когда кабинет свёрнут
  font: 'small' | 'normal' | 'large';
  motion: boolean;       // анимации
}

const KEY = 'vet_prefs';
const DEFAULTS: Prefs = { sound: true, volume: 0.6, vibrate: true, notify: false, font: 'normal', motion: true };

export function getPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
}

export function setPrefs(p: Partial<Prefs>) {
  const next = { ...getPrefs(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  applyPrefs(next);
  return next;
}

const FONT_PX = { small: '15px', normal: '16px', large: '18px' };

export function applyPrefs(p: Prefs = getPrefs()) {
  document.documentElement.style.fontSize = FONT_PX[p.font] ?? '16px';
  document.documentElement.classList.toggle('no-motion', !p.motion);
}

// Сигнал нового заказа (три нарастающих ноты)
export function playChime(force = false) {
  const p = getPrefs();
  if (p.sound || force) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      [[880, 0], [1175, 0.16], [1568, 0.32]].forEach(([f, t]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.02, 0.4 * p.volume), ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.45);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.5);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch { /* звук недоступен */ }
  }
  if (p.vibrate) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* */ } }
}

// Уведомление на экран, если кабинет свёрнут или открыт в другой вкладке
export function notifyNewOrder(title: string, body: string) {
  const p = getPrefs();
  if (!p.notify || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(title, { body, icon: '/icons/icon-192.png' }); } catch { /* */ }
}
