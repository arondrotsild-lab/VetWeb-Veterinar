import { LOC } from './i18n';
// Неразрывный пробел перед ₽ — знак рубля никогда не переносится на новую строку
export const rub = (n: number | null | undefined) => `${Math.round(n || 0).toLocaleString('ru-RU')}\u00A0₽`;
export const num = (n: number | null | undefined) => Math.round(n || 0).toLocaleString('ru-RU');

export const time = (d: string | Date) => new Date(d).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });
export const dateShort = (d: string | Date) => new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'short' });
export const dateLong = (d: string | Date) => new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' });

export function when(d: string | Date) {
  const x = new Date(d);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const t = time(x);
  if (same(x, today)) return `сегодня, ${t}`;
  if (same(x, tomorrow)) return `завтра, ${t}`;
  if (same(x, yesterday)) return `вчера, ${t}`;
  return `${dateShort(x)}, ${t}`;
}

export function ago(d: string | Date) {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return dateShort(d);
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function duration(fromIso?: string | null) {
  if (!fromIso) return '';
  const m = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h} ч ${m % 60} мин` : `${m} мин`;
}

export const STATUS: Record<string, { label: string; color: string; action?: string }> = {
  pending:     { label: 'Новый',          color: '#FACC15' },
  confirmed:   { label: 'Принят',         color: '#9BCD67', action: 'Выехал к клиенту' },
  on_the_way:  { label: 'В пути',         color: '#7CB842', action: 'Я на месте' },
  arrived:     { label: 'На месте',       color: '#C99A63', action: 'Начать приём' },
  in_progress: { label: 'Идёт приём',     color: '#D9895F', action: 'Завершить приём' },
  completed:   { label: 'Выполнен',       color: '#7CB842' },
  cancelled:   { label: 'Отменён',        color: '#f87171' },
};

export const STEPS = ['confirmed', 'on_the_way', 'arrived', 'in_progress', 'completed'];

export const speciesEmoji = (s?: string) => {
  const x = (s || '').toLowerCase();
  if (x.includes('соба')) return '🐕';
  if (x.includes('кош') || x.includes('кот')) return '🐈';
  if (x.includes('птиц') || x.includes('попуг')) return '🦜';
  if (x.includes('крол')) return '🐇';
  if (x.includes('череп')) return '🐢';
  if (x.includes('свин') || x.includes('хомя') || x.includes('крыс')) return '🐹';
  return '🐾';
};

export const URGENCY: Record<string, { label: string; color: string }> = {
  emergency: { label: 'Экстренно', color: '#f87171' },
  urgent: { label: 'Сегодня', color: '#FACC15' },
  routine: { label: 'Планово', color: '#9BCD67' },
};

import { useEffect, useState } from 'react';
// Телефон или компьютер (до 768 px — мобильное приложение)
export function useIsMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return m;
}
