import { useEffect, useState } from 'react';
import { Avatar, PageTitle, Segmented, Spinner } from '../components/ui';
import { useIsMobile } from '../lib/format';
import PrizeFund from '../components/PrizeFund';
import { getLeague, Tier } from '../lib/api';
import { plural } from '../lib/format';

interface Row {
  rank: number; id: number; name: string; photo_url?: string; specialization?: string; is_available: boolean;
  orders_30d: number; rating: number; speed_min: number; return_rate: number; score: number; tier: Tier; is_me: boolean;
}
interface League { metric: string; season: string; days_left: number; prizes: { place: number; prize: string }[]; rows: Row[] }

const METRICS = [
  { k: 'score', short: 'Очки', l: 'Общий зачёт', col: 'Очки', v: (r: Row) => String(r.score) },
  { k: 'orders', short: 'Визиты', l: 'Визиты', col: 'Визитов', v: (r: Row) => String(r.orders_30d) },
  { k: 'rating', short: 'Оценка', l: 'Рейтинг', col: 'Оценка', v: (r: Row) => r.rating.toFixed(2) },
  { k: 'return', short: 'Возврат', l: 'Возвращаемость', col: 'Вернулись', v: (r: Row) => `${r.return_rate}%` },
  { k: 'speed', short: 'Темп', l: 'Скорость', col: 'Принимает', v: (r: Row) => `${r.speed_min} мин` },
];
const PODIUM = ['#F2C14E', '#C9CFD6', '#D08A4E'];

export default function LeaguePage() {
  const [metric, setMetric] = useState('score');
  const [d, setD] = useState<League | null>(null);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'rating' | 'prizes'>('rating');
  const show = (t: typeof tab) => !isMobile || tab === t;
  useEffect(() => { getLeague(metric).then(setD).catch(() => {}); }, [metric]);
  if (!d) return <Spinner />;
  const M = METRICS.find((x) => x.k === metric) ?? METRICS[0];
  const me = d.rows.find((r) => r.is_me);
  const top = d.rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <div className="space-y-5">
      <PageTitle title="Лига ветеринаров" sub="Рейтинг врачей платформы за последние 30 дней" />

      <Segmented className="md:hidden" value={tab} onChange={setTab} options={[{ k: 'rating', label: 'Рейтинг врачей' }, { k: 'prizes', label: 'Призы и правила' }]} />

      {show('prizes') && <PrizeFund />}

      {/* Сезон */}
      {show('prizes') && <section className="card-warm">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-[#FACC15]/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <div className="eyebrow">Сезон · {d.season}</div>
            <div className="text-3xl md:text-4xl font-black mt-1">🏆 Лига ВетДом</div>
            <div className="text-white/60 mt-1">До конца сезона {d.days_left} {plural(d.days_left, 'день', 'дня', 'дней')}</div>
          </div>
        </div>
        <div className="relative grid sm:grid-cols-3 gap-2 mt-5">
          {d.prizes.map((p, i) => (
            <div key={p.place} className="rounded-2xl bg-black/20 border border-white/10 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="text-sm text-white/80">{p.prize}</span>
            </div>
          ))}
        </div>
      </section>}

      {/* Метрика */}
      {show('rating') && (
        <Segmented sticky={false} small value={metric} onChange={setMetric} className="md:max-w-xl"
          options={METRICS.map((x) => ({ k: x.k, label: x.short }))} />
      )}

      {/* Пьедестал */}
      {show('rating') && <section className="grid grid-cols-3 gap-2 md:gap-4 items-end pt-4">
        {order.map((r) => {
          const place = r.rank;
          const h = place === 1 ? 'h-32 md:h-40' : place === 2 ? 'h-24 md:h-28' : 'h-20 md:h-24';
          return (
            <div key={r.id} className="flex flex-col items-center text-center fade-up">
              <div className="relative">
                <Avatar src={r.photo_url} name={r.name} size={place === 1 ? 84 : 66} ring={PODIUM[place - 1]} />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl">{['🥇', '🥈', '🥉'][place - 1]}</span>
              </div>
              <div className={`mt-3 font-black text-sm md:text-base leading-tight ${r.is_me ? 'text-green-300' : ''}`}>{r.name.split(' ')[0]}<span className="hidden md:inline"> {r.name.split(' ')[1]}</span></div>
              <div className="text-[11px] text-white/50">{M.v(r)} {metric === 'score' ? 'очков' : ''}</div>
              <div className={`w-full mt-2 rounded-t-2xl ${h} flex items-start justify-center pt-3 text-3xl font-black`}
                style={{ background: `linear-gradient(180deg, ${PODIUM[place - 1]}55, ${PODIUM[place - 1]}10)`, border: `1px solid ${PODIUM[place - 1]}66`, borderBottom: 'none' }}>
                {place}
              </div>
            </div>
          );
        })}
      </section>}

      {/* Таблица */}
      {show('rating') && <section className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="hidden md:grid grid-cols-[56px_1fr_100px_90px_100px_100px_90px] gap-2 px-5 py-3 text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10">
          <span>#</span><span>Врач</span><span className="text-right">Визитов</span><span className="text-right">Оценка</span><span className="text-right">Вернулись</span><span className="text-right">Принимает</span><span className="text-right">Очки</span>
        </div>
        {d.rows.map((r) => (
          <div key={r.id} className={`grid grid-cols-[40px_1fr_auto] md:grid-cols-[56px_1fr_100px_90px_100px_100px_90px] gap-2 items-center px-4 md:px-5 py-3 border-b border-white/[0.05] last:border-0 ${
            r.is_me ? 'bg-green-500/[0.12] border-l-4 border-l-green-400' : ''}`}>
            <span className={`font-black text-lg ${r.rank <= 3 ? 'text-[#FACC15]' : 'text-white/50'}`}>{r.rank}</span>
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar src={r.photo_url} name={r.name} size={40} ring={r.tier.color} />
                {r.is_available && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#2A1D14]" title="На линии" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold leading-snug">{r.name}{r.is_me && <span className="text-green-300"> · вы</span>}</div>
                <div className="text-[11px] leading-snug"><span className="whitespace-nowrap" style={{ color: r.tier.color }}>{r.tier.icon} {r.tier.name}</span><span className="text-white/40"> · {r.specialization}</span></div>
              </div>
            </div>
            <div className="md:hidden text-right"><div className="font-black">{M.v(r)}</div><div className="text-[10px] text-white/40">{M.col}</div></div>
            <span className={`hidden md:block text-right tabular-nums ${metric === 'orders' ? 'font-black text-white' : 'text-white/70'}`}>{r.orders_30d}</span>
            <span className={`hidden md:block text-right tabular-nums ${metric === 'rating' ? 'font-black text-white' : 'text-white/70'}`}>★ {r.rating.toFixed(2)}</span>
            <span className={`hidden md:block text-right tabular-nums ${metric === 'return' ? 'font-black text-white' : 'text-white/70'}`}>{r.return_rate}%</span>
            <span className={`hidden md:block text-right tabular-nums ${metric === 'speed' ? 'font-black text-white' : 'text-white/70'}`}>{r.speed_min} мин</span>
            <span className={`hidden md:block text-right tabular-nums ${metric === 'score' ? 'font-black text-green-300' : 'text-white/70'}`}>{r.score}</span>
          </div>
        ))}
      </section>}

      {show('prizes') && <section className="card text-sm text-white/60 leading-relaxed">
        <div className="font-black text-white mb-2">Как считаются очки</div>
        Общий зачёт складывается из четырёх показателей: <b className="text-white">визиты за 30 дней</b> (35%), <b className="text-white">средняя оценка</b> (30%),
        <b className="text-white"> доля клиентов, которые вернулись</b> (20%) и <b className="text-white">скорость принятия заказа</b> (15%). Максимум — 1000 очков.
      </section>}
    </div>
  );
}
