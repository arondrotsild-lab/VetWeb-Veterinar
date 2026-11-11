import { useEffect, useRef, useState } from 'react';
import { getLang, LANGS, setLang } from '../lib/i18n';

// Кнопка «🌐 Язык» — всегда на виду: нажали, выбрали язык
export default function LangMenu({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = LANGS.find((l) => l.k === getLang()) ?? LANGS[0];
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  return (
    <div ref={ref} data-notr className={`relative ${className}`} dir="ltr">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Language"
        className={`flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 backdrop-blur-xl text-white font-bold shadow-lg shadow-black/30 hover:bg-black/40 transition-colors ${compact ? 'h-9 px-2.5 text-[12px]' : 'h-10 px-3.5 text-sm'}`}>
        <span className={compact ? 'text-[15px]' : 'text-base'}>🌐</span>
        {!compact && <span className="text-white/70 font-semibold">Language ·</span>}
        <span>{cur.short}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#2A1D14] border border-white/15 shadow-2xl shadow-black/60 p-1.5 z-[95]">
          {LANGS.map((l) => (
            <button key={l.k} type="button" onClick={() => { setOpen(false); if (l.k !== cur.k) setLang(l.k); }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left ${l.k === cur.k ? 'bg-green-500/20 text-green-300' : 'text-white/85 hover:bg-white/[0.06]'}`}>
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.k === cur.k && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
