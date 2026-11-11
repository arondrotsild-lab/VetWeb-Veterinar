import { useEffect, useState } from 'react';
import { LOC } from '../lib/i18n';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { Empty, OrderCard, Ring, Spinner, StatusChip } from '../components/ui';
import TierScale from '../components/TierScale';
import { useVet } from '../lib/vet';
import { acceptOrder, declineOrder, demoIncoming, errText, getLeague, getNews, nextStep } from '../lib/api';
import { duration, rub, when, speciesEmoji, STATUS, plural, useIsMobile } from '../lib/format';
import MobileHome from '../components/MobileHome';
import PrizeFund from '../components/PrizeFund';

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
}

export default function DashboardPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <DesktopDashboard />;
}

function DesktopDashboard() {
  const { me, feed, online, setOnline, toggling, refresh } = useVet();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [league, setLeague] = useState<{ rank: number; total: number; season: string } | null>(null);
  const [news, setNews] = useState<{ id: number; title: string; category: string; published_at: string }[]>([]);

  useEffect(() => {
    getLeague('score').then((d) => {
      const mine = d.rows.find((r: { is_me: boolean }) => r.is_me);
      setLeague({ rank: mine?.rank ?? 0, total: d.rows.length, season: d.season });
    }).catch(() => {});
    getNews().then((n) => setNews(n.slice(0, 3))).catch(() => {});
  }, []);

  if (!me) return <Spinner />;
  const m = me.metrics;
  const goal = me.profile.daily_goal || 5;
  const first = me.profile.name.split(' ')[0];
  const active = feed?.active ?? [];
  const incoming = feed?.incoming ?? [];
  const current = active[0];

  const accept = async (id: number) => {
    setBusy(id); setMsg('');
    try { await acceptOrder(id); await refresh(); navigate(`/orders/${id}`); }
    catch (e) { setMsg(errText(e)); refresh(); } finally { setBusy(null); }
  };
  const decline = async (id: number) => { setBusy(id); await declineOrder(id).catch(() => {}); await refresh(); setBusy(null); };
  const step = async () => {
    if (!current) return;
    if (current.status === 'in_progress') { navigate(`/orders/${current.id}?finish=1`); return; }
    setBusy(current.id);
    try { await nextStep(current.id); await refresh(); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5 md:space-y-6">
      {/* ═══ Приветствие + статус ═══ */}
      <section className="card-warm fade-up">
        <div className="absolute inset-0 grid-bg opacity-70 pointer-events-none" />
        <div className={`absolute -right-24 -top-24 w-72 h-72 rounded-full blur-3xl pointer-events-none ${online ? 'bg-green-400/25' : 'bg-amber-300/10'}`} />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="eyebrow">{new Date().toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">{greeting()}, {first}!</h1>
            <p className="text-white/65 mt-1.5">
              {online
                ? <>Вы на линии {duration(me.profile.online_since)}. {incoming.length ? <b className="text-[#FACC15]">{incoming.length} {plural(incoming.length, 'новый заказ', 'новых заказа', 'новых заказов')} ждут вас</b> : 'Ждём новые заказы рядом с вами…'}</>
                : 'Вы не на линии — заказы не приходят. Включите статус, когда будете готовы к выездам.'}
            </p>
            <button onClick={() => setOnline(!online)} disabled={toggling}
              className={`mt-5 inline-flex items-center gap-3 rounded-2xl px-6 py-4 font-black text-lg transition-all active:scale-[0.97] ${
                online ? 'bg-white/[0.08] border border-white/15 hover:bg-white/[0.12]' : 'bg-green-500 hover:bg-green-400 shadow-xl shadow-green-900/40 live-pulse'}`}>
              <Icon name="power" size={22} stroke={2.6} />
              {online ? 'Уйти с линии' : 'Выйти на линию'}
            </button>
          </div>

          {/* Цель дня */}
          <div className="flex items-center gap-5 rounded-3xl bg-black/25 border border-white/10 p-4 md:p-5">
            <Ring value={m.completed_today} max={goal} size={104}>
              <div className="text-2xl font-black leading-none">{m.completed_today}<span className="text-white/40 text-base">/{goal}</span></div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">цель дня</div>
            </Ring>
            <div className="space-y-2.5">
              <div><div className="text-[11px] text-white/45 uppercase tracking-wider">Сегодня заработано</div><div className="text-2xl font-black text-green-300">{rub(m.earned_today)}</div></div>
              <div className="flex gap-5">
                <div><div className="text-[11px] text-white/45">На линии</div><div className="font-bold">{m.hours_today} ч</div></div>
                <div><div className="text-[11px] text-white/45">За неделю</div><div className="font-bold">{rub(m.earned_week)}</div></div>
              </div>
            </div>
          </div>
        </div>
        {m.completed_today < goal && (
          <div className="relative mt-5 text-sm text-amber-100/80 flex items-center gap-2">
            <Icon name="target" size={16} className="text-[#FACC15]" />
            Ещё {goal - m.completed_today} {plural(goal - m.completed_today, 'визит', 'визита', 'визитов')} до цели дня — бонус <b className="text-[#FACC15]">+500 ₽</b>
          </div>
        )}
      </section>

      {/* ═══ Текущий заказ ═══ */}
      {current && (
        <section className="fade-up rounded-3xl border-2 border-green-400/40 bg-gradient-to-br from-green-900/40 to-[#2A1D14] p-5 md:p-6" style={{ ['--d' as string]: '60ms' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-400 live-pulse" /><span className="eyebrow !text-green-300">Текущий заказ</span></div>
            <StatusChip status={current.status} />
          </div>
          <Link to={`/orders/${current.id}`} className="flex items-center gap-4">
            <span className="text-4xl">{speciesEmoji(current.pet_species)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black">{current.service_name} · {current.pet_name}</div>
              <div className="text-sm text-white/60 truncate">{current.client_name} · {current.address}</div>
              <div className="text-sm text-white/45">{when(current.scheduled_at)}</div>
            </div>
            <div className="text-right hidden sm:block"><div className="text-2xl font-black text-green-300">{rub(current.payout_estimate ?? Math.round(((current.total_price || 0) + (current.bonus_used || 0)) * (feed?.percent || 55) / 100))}</div><div className="text-[11px] text-white/40">ваш доход</div></div>
          </Link>
          <div className="mt-5 grid sm:grid-cols-[1fr_auto_auto] gap-2">
            <button onClick={step} disabled={busy === current.id} className="btn-green py-4 text-base">{STATUS[current.status]?.action} <Icon name="chevron" size={18} /></button>
            <a href={`https://yandex.ru/maps/?text=${encodeURIComponent(current.address)}`} target="_blank" rel="noreferrer" className="btn-ghost"><Icon name="map" size={18} />Маршрут</a>
            {current.client_phone && <a href={`tel:${current.client_phone}`} className="btn-ghost"><Icon name="phone" size={18} />Позвонить</a>}
          </div>
          {active.length > 1 && <Link to="/orders" className="block mt-3 text-sm text-green-300">+ ещё {active.length - 1} в работе →</Link>}
        </section>
      )}

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5 md:gap-6">
        {/* ═══ Новые заказы ═══ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-2">Новые заказы {online && incoming.length > 0 && <span className="chip bg-[#FACC15] text-[#1E140D]">{incoming.length}</span>}</h2>
            {online && <button onClick={async () => { await demoIncoming(); }} className="text-xs font-bold text-amber-200/70 hover:text-amber-100 border border-amber-300/25 rounded-full px-3 py-1.5" title="Для показа: прилетит новый заказ от клиента">
              ✨ Тестовый заказ
            </button>}
          </div>
          {msg && <div className="text-sm text-red-300">{msg}</div>}
          {!online ? (
            <Empty icon="😴" title="Вы не на линии" text="Включите статус «На линии», и заказы рядом с вами появятся здесь. Мы сообщим о каждом новом заказе звуком.">
              <button onClick={() => setOnline(true)} className="btn-green">Выйти на линию</button>
            </Empty>
          ) : incoming.length === 0 ? (
            <Empty icon="🛰️" title="Ищем заказы рядом" text="Как только клиент вызовет врача — заказ появится здесь, а вы услышите сигнал." />
          ) : (
            incoming.slice(0, 4).map((o) => <OrderCard key={o.id} o={o} busy={busy === o.id} onAccept={() => accept(o.id)} onDecline={() => decline(o.id)} />)
          )}
          {online && incoming.length > 4 && <Link to="/orders" className="block text-center text-sm text-green-300 py-2">Все новые заказы ({incoming.length}) →</Link>}
        </section>

        {/* ═══ Правая колонка ═══ */}
        <section className="space-y-5">
          {/* Уровень */}
          <Link to="/kpi" className="block card hover:border-white/20 transition-colors fade-up" style={{ ['--d' as string]: '80ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="eyebrow">Мой уровень</div>
                <div className="text-2xl font-black mt-0.5" style={{ color: me.tier.current.color }}>{me.tier.current.icon} {me.tier.current.name}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-green-300">{me.tier.current.percent}%</div>
                <div className="text-[11px] text-white/45">от каждого заказа</div>
              </div>
            </div>
            <TierScale tiers={me.tiers} completed={m.completed_total} compact />
            {me.tier.next && (
              <div className="text-sm text-white/65 mt-4">
                Ещё <b className="text-white">{me.tier.orders_to_next}</b> {plural(me.tier.orders_to_next, 'визит', 'визита', 'визитов')}
                {!me.tier.rating_ok_for_next && <> и рейтинг <b className="text-white">{me.tier.next.minRating}</b></>} — и вы получаете <b style={{ color: me.tier.next.color }}>{me.tier.next.percent}%</b>
              </div>
            )}
          </Link>

          {/* Мини-статистика */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: 'Рейтинг', v: m.rating.toFixed(2), s: `${m.reviews} отзывов`, icon: 'star', c: '#FACC15' },
              { l: 'Возвращаются', v: `${m.return_rate}%`, s: 'клиентов', icon: 'repeat', c: '#9BCD67' },
              { l: 'Принимаю за', v: `${m.avg_accept_min ?? '—'} мин`, s: 'в среднем', icon: 'bolt', c: '#D9895F' },
              { l: 'За месяц', v: rub(m.earned_month), s: `${m.completed_30d} визитов`, icon: 'wallet', c: '#C99A63' },
            ].map((x, i) => (
              <div key={x.l} className="card !p-4 fade-up" style={{ ['--d' as string]: `${120 + i * 40}ms` }}>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 uppercase tracking-wider"><Icon name={x.icon} size={14} className="flex-shrink-0" />{x.l}</div>
                <div className="text-xl font-black mt-1.5" style={{ color: x.c }}>{x.v}</div>
                <div className="text-[11px] text-white/40">{x.s}</div>
              </div>
            ))}
          </div>

          {/* Призовой фонд лиги */}
          <PrizeFund compact />

          {/* Новости */}
          {news.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3"><div className="font-black">Новости</div><Link to="/news" className="text-xs text-green-300">Все →</Link></div>
              <div className="space-y-3">
                {news.map((n) => (
                  <Link key={n.id} to={`/news?id=${n.id}`} className="block group">
                    <div className="text-sm font-semibold text-white/85 group-hover:text-white leading-snug">{n.title}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{new Date(n.published_at).toLocaleDateString(LOC, { day: 'numeric', month: 'long' })}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
