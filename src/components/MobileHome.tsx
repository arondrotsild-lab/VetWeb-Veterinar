import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVet } from '../lib/vet';
import Tile3D from './Tile3D';
import { acceptOrder, demoIncoming, getLeague } from '../lib/api';
import { duration, plural, rub, speciesEmoji, STATUS, when } from '../lib/format';

// Главный экран мобильного приложения врача — всё на одном экране, как в клиентском приложении
export default function MobileHome() {
  const { me, feed, online, setOnline, toggling, refresh } = useVet();
  const navigate = useNavigate();
  const [rank, setRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getLeague('score').then((d) => setRank(d.rows.find((r: { is_me: boolean }) => r.is_me)?.rank ?? null)).catch(() => {});
  }, []);

  if (!me) return <div className="flex justify-center py-24"><div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-green-400 animate-spin" /></div>;

  const m = me.metrics;
  const tier = me.tier.current;
  const goal = me.profile.daily_goal || 5;
  const incoming = feed?.incoming ?? [];
  const active = feed?.active ?? [];
  const current = active[0];
  const next = incoming[0];
  const h = new Date().getHours();
  const hello = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';

  const TILES = [
    { to: '/orders', label: 'Новые заказы', icon: '🔔', tone: 'yellow', badge: online ? incoming.length : 0,
      sub: online ? (incoming.length ? `${incoming.length} рядом · до ${rub(Math.max(0, ...incoming.map((o) => o.payout_estimate || 0)))}` : 'ищем рядом с вами…') : 'выйдите на линию' },
    { to: '/orders?tab=active', label: 'В работе', icon: '🩺', tone: 'green', badge: active.length, sub: active.length ? `${active.length} заказ` : 'свободны' },
    { to: '/finance', label: 'Доход', icon: '💰', tone: 'teal', sub: `сегодня ${rub(m.earned_today)}` },
    { to: '/kpi', label: 'Цель дня', icon: '🎯', tone: 'red', sub: `${m.completed_today} из ${goal} визитов` },
    { to: '/kpi', label: 'Мой уровень', icon: tier.icon, tone: 'purple', sub: `${tier.name} · ${tier.percent}%` },
    { to: '/league', label: 'Лига', icon: '🏆', tone: 'amber', sub: rank ? `${rank} место` : 'приз за 1 место' },
    { to: '/news', label: 'Новости', icon: '📰', tone: 'sky', sub: 'свежие' },
    { to: '/orders?tab=history', label: 'История', icon: '🗂️', tone: 'coffee', sub: `${m.completed_total} визитов` },
  ];

  const takeNext = async () => {
    if (!next) return;
    setBusy(true);
    try { await acceptOrder(next.id); await refresh(); navigate(`/orders/${next.id}`); }
    catch { refresh(); } finally { setBusy(false); }
  };

  return (
    <div className="-mx-4 -mt-4 -mb-4 min-h-[calc(100dvh-9.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-gradient-to-b from-[#5A2F1E] via-[#3B2117] to-[#24150E] px-4 pt-3 pb-3 flex flex-col gap-2.5">
      {/* Приветствие + профиль */}
      <Link to="/profile" className="glass3d flex items-center gap-3 rounded-2xl bg-white/[0.08] border border-white/15 px-3 py-2.5 active:scale-[0.98] transition-transform">
        <img src={me.profile.photo_url || '/logo.jpeg'} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{ boxShadow: `0 0 0 2px ${tier.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/60 leading-tight">{hello} 👋</div>
          <div className="font-black leading-tight">{me.profile.name}</div>
          <div className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.icon} {tier.name} · {tier.percent}% от заказа</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-white/50 uppercase">Баланс</div>
          <div className="font-black text-sm whitespace-nowrap">{rub(me.balance)}</div>
        </div>
      </Link>

      {/* Главное действие — линия */}
      {online ? (
        <div className="hero3d relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8BD14E] via-green-600 to-green-800 p-3.5">
          <span className="tile3d-gloss" /><div className="absolute -right-3 -bottom-5 text-[92px] leading-none opacity-30 select-none" style={{ filter: 'drop-shadow(0 10px 10px rgba(0,0,0,.35))' }}>🩺</div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                <span className="w-2 h-2 rounded-full bg-white live-pulse" />На линии · {duration(me.profile.online_since)}
              </div>
              <div className="text-lg font-black mt-0.5 leading-tight">
                {incoming.length ? `${incoming.length} ${plural(incoming.length, 'новый заказ', 'новых заказа', 'новых заказов')} рядом` : 'Ищем заказы рядом…'}
              </div>
            </div>
            <button onClick={() => setOnline(false)} disabled={toggling} className="flex-shrink-0 rounded-xl bg-black/20 border border-white/25 text-xs font-bold px-3 py-2 active:scale-95">Уйти</button>
          </div>
          {next ? (
            <button onClick={takeNext} disabled={busy} className="relative mt-3 w-full flex items-center gap-3 rounded-2xl bg-white text-[#1E140D] px-3 py-2.5 text-left active:scale-[0.98] transition-transform">
              <span className="text-2xl">{speciesEmoji(next.pet_species)}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-sm leading-snug">{next.service_name} · {next.pet_name}</span>
                <span className="block text-[11px] text-[#6F4E37] leading-snug">{when(next.scheduled_at)} · {next.address.replace('Москва, ', '')}</span>
              </span>
              <span className="text-right flex-shrink-0">
                <span className="block font-black text-green-700 whitespace-nowrap">{rub(next.payout_estimate)}</span>
                <span className="block text-[10px] font-bold text-green-700">Принять ›</span>
              </span>
            </button>
          ) : (
            <button onClick={() => demoIncoming()} className="relative mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 text-xs font-bold px-3 py-2">✨ Тестовый заказ</button>
          )}
        </div>
      ) : (
        <button onClick={() => setOnline(true)} disabled={toggling}
          className="hero3d relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8BD14E] via-green-600 to-green-800 p-4 text-left active:scale-[0.98] transition-transform">
          <span className="tile3d-gloss" /><div className="absolute -right-3 -bottom-5 text-[92px] leading-none opacity-30 select-none" style={{ filter: 'drop-shadow(0 10px 10px rgba(0,0,0,.35))' }}>🩺</div>
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Сейчас вы не на линии</div>
            <div className="text-2xl font-black mt-1">Выйти на линию</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white text-green-700 font-black text-sm px-4 py-2">
              ⚡ Начать принимать заказы <span>›</span>
            </div>
          </div>
        </button>
      )}

      {/* Текущий заказ */}
      {current && (
        <Link to={`/orders/${current.id}`} className="flex items-center gap-3 rounded-2xl bg-sky-500/15 border border-sky-400/30 px-4 py-2.5 active:scale-[0.98] transition-transform">
          <span className="relative w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-sky-400 animate-ping" /><span className="absolute inset-0 rounded-full bg-sky-400" /></span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-snug">{STATUS[current.status]?.label} · {current.pet_name}</div>
            <div className="text-[11px] text-white/60 leading-snug">{current.service_name} · {current.address.replace('Москва, ', '')}</div>
          </div>
          <span className="text-sky-300 text-sm font-bold flex-shrink-0">{STATUS[current.status]?.action ? 'Далее ›' : 'Открыть ›'}</span>
        </Link>
      )}

      {/* Плитки разделов */}
      <div className="grid grid-cols-3 gap-2.5">
        {TILES.map((t, i) => <Tile3D key={t.label + i} wide={i === 0} to={t.to} icon={t.icon} label={t.label} sub={t.sub} tone={t.tone} badge={t.badge} />)}
      </div>

    </div>
  );
}
