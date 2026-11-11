import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { Order } from '../lib/api';
import { rub, when, ago, speciesEmoji, STATUS, URGENCY } from '../lib/format';
import { useVet } from '../lib/vet';

export function Avatar({ src, name, size = 44, ring }: { src?: string | null; name?: string; size?: number; ring?: string }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined };
  return src ? (
    <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0 bg-white/10" style={style} />
  ) : (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center font-black text-green-300 bg-green-400/15 border border-green-400/30"
      style={{ ...style, fontSize: size * 0.36 }}>{initials}</div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(value) ? '#FACC15' : 'rgba(255,255,255,0.15)'}>
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, color: '#aaa' };
  return (
    <span className="chip" style={{ color: s.color, background: `${s.color}1f`, border: `1px solid ${s.color}55` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{s.label}
    </span>
  );
}

// Большой переключатель «На линии / Не на линии»
export function OnlineSwitch({ compact = false }: { compact?: boolean }) {
  const { online, setOnline, toggling } = useVet();
  return (
    <button onClick={() => setOnline(!online)} disabled={toggling} aria-pressed={online}
      className={`group inline-flex items-center gap-3 rounded-full transition-all duration-300 ${compact ? 'pl-1.5 pr-3.5 py-1.5' : 'pl-2 pr-5 py-2'} ${
        online ? 'bg-green-500/15 border border-green-400/50' : 'bg-white/[0.06] border border-white/15'} disabled:opacity-60`}>
      <span className={`relative rounded-full transition-colors ${compact ? 'w-10 h-6' : 'w-12 h-7'} ${online ? 'bg-green-500' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 rounded-full bg-white shadow transition-all duration-300 ${compact ? 'w-5 h-5' : 'w-6 h-6'} ${online ? (compact ? 'left-[18px]' : 'left-[22px]') : 'left-0.5'}`} />
      </span>
      <span className="text-left leading-tight">
        <span className={`block font-black ${compact ? 'text-xs' : 'text-sm'} ${online ? 'text-green-300' : 'text-white/80'}`}>
          {online ? 'На линии' : 'Не на линии'}
        </span>
        {!compact && <span className="block text-[11px] text-white/45">{online ? 'Принимаю заказы' : 'Заказы не приходят'}</span>}
      </span>
    </button>
  );
}

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  // Окно рисуем прямо в <body>, чтобы оно всегда держалось на экране, где бы ни была прокрутка
  return createPortal(
    <div className="sheet-wrap fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className={`sheet slide-up relative w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'} max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-3xl md:rounded-3xl border border-white/10 bg-[#2A1D14] p-5 md:p-7 shadow-2xl`}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          {title ? <h3 className="text-xl font-black">{title}</h3> : <span />}
          <button onClick={onClose} className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10" aria-label="Закрыть">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Карточка заказа в ленте
export function OrderCard({ o, onAccept, onDecline, busy }: { o: Order; onAccept?: () => void; onDecline?: () => void; busy?: boolean }) {
  const urgent = o.service_name === 'Скорая ветпомощь';
  const tri = o.ai_triage?.urgency ? URGENCY[o.ai_triage.urgency as string] : null;
  const incoming = o.status === 'pending';
  return (
    <div className={`fade-up min-w-0 w-full rounded-3xl border p-4 md:p-5 transition-colors ${incoming ? 'border-amber-300/30 bg-gradient-to-br from-[#4A3426]/70 to-[#2A1D14]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
      <Link to={`/orders/${o.id}`} className="block">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
            {o.pet_photo ? <img src={o.pet_photo} alt="" className="w-full h-full object-cover rounded-2xl" /> : speciesEmoji(o.pet_species)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-white">{o.service_name}</span>
              {urgent && <span className="chip bg-red-500/15 text-red-300 border border-red-400/30">🚨 Срочно</span>}
              {tri && !urgent && <span className="chip" style={{ color: tri.color, background: `${tri.color}1a`, border: `1px solid ${tri.color}44` }}>ИИ: {tri.label}</span>}
              {!incoming && <StatusChip status={o.status} />}
            </div>
            <div className="text-sm text-white/70 mt-0.5 leading-snug">
              {o.pet_name} · {o.pet_species}{o.pet_breed ? `, ${o.pet_breed}` : ''}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-black text-green-300 whitespace-nowrap">{rub(o.vet_payout ?? o.payout_estimate)}</div>
            <div className="text-[11px] text-white/40 whitespace-nowrap">вам · из {rub((o.total_price || 0) + (o.bonus_used || 0))}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-1.5 text-[13px] text-white/60">
          <div className="flex items-center gap-2"><Icon name="pin" size={15} className="text-amber-300/80 flex-shrink-0" /><span className="leading-snug">{o.address}</span></div>
          <div className="flex items-center gap-2"><Icon name="clock" size={15} className="text-amber-300/80 flex-shrink-0" />
            <span>{when(o.scheduled_at)}</span>{incoming && <span className="text-white/35">· создан {ago(o.created_at)}</span>}
          </div>
          {o.notes && <div className="hidden md:flex items-start gap-2"><Icon name="doc" size={15} className="text-amber-300/80 flex-shrink-0 mt-0.5" /><span className="leading-snug">«{o.notes}»</span></div>}
        </div>
      </Link>
      {incoming && onAccept && (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button onClick={onAccept} disabled={busy} className="btn-green py-3"><Icon name="check" size={18} />Принять заказ</button>
          <button onClick={onDecline} disabled={busy} className="btn-ghost px-4" aria-label="Пропустить"><Icon name="x" size={18} /></button>
        </div>
      )}
    </div>
  );
}

// Кольцевой прогресс (цель дня и т.п.)
export function Ring({ value, max, size = 92, color = '#7CB842', children }: { value: number; max: number; size?: number; color?: string; children?: ReactNode }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, max ? value / max : 0);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Empty({ icon, title, text, children }: { icon: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="text-center py-10 px-6 rounded-3xl border border-dashed border-white/15">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-black text-white">{title}</div>
      {text && <p className="text-sm text-white/50 mt-1 max-w-sm mx-auto">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="hidden md:flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {sub && <p className="text-white/50 mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-20"><div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-green-400 animate-spin" /></div>;
}

// Переключатель вкладок как в приложениях: все кнопки помещаются в экран, ничего не нужно листать вбок.
// sticky — на телефоне «прилипает» под шапкой, чтобы вкладки всегда были под пальцем.
export function Segmented<T extends string>({ value, onChange, options, sticky = true, className = '', small = false }: {
  value: T; onChange: (v: T) => void; options: { k: T; label: string; badge?: number }[]; sticky?: boolean; className?: string; small?: boolean;
}) {
  return (
    <div className={`${sticky ? 'sticky z-30 -mx-4 px-4 py-2 bg-[#1F150E]/95 backdrop-blur-xl md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none' : ''} ${className}`}
      style={sticky ? { top: 'calc(4rem + env(safe-area-inset-top))' } : undefined}>
      <div data-tabs className="grid gap-1 p-1 rounded-2xl bg-white/[0.06] border border-white/10" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const on = o.k === value;
          return (
            <button key={o.k} type="button" data-active={on ? '1' : undefined} onClick={() => { if (!on) { onChange(o.k); window.scrollTo({ top: 0 }); } }}
              className={`relative min-w-0 rounded-xl px-1 py-2.5 ${small ? 'text-[12px]' : 'text-[13px]'} font-bold leading-tight transition-colors ${on ? 'bg-green-500 text-white shadow-lg shadow-green-900/30' : 'text-white/65 active:bg-white/10'}`}>
              <span className="block truncate">{o.label}</span>
              {!!o.badge && (
                <span className={`absolute -top-1.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${on ? 'bg-white text-green-700' : 'bg-[#FACC15] text-[#1E140D]'}`}>{o.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
