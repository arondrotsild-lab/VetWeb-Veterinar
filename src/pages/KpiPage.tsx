import { useEffect, useState } from 'react';
import { LOC } from '../lib/i18n';
import Icon from '../components/Icon';
import { PageTitle, Ring, Segmented, Spinner } from '../components/ui';
import TierScale from '../components/TierScale';
import PrizeFund from '../components/PrizeFund';
import { getKpi, Metrics, Tier, TierInfo } from '../lib/api';
import { rub, plural, useIsMobile } from '../lib/format';

const AWARD_BG = [
  'linear-gradient(145deg, #FFE36E 0%, #FACC15 45%, #C98A06 100%)', 'linear-gradient(145deg, #8BD14E 0%, #5E9E2C 45%, #2F5119 100%)',
  'linear-gradient(145deg, #FF9A8A 0%, #E2533E 50%, #8E2416 100%)', 'linear-gradient(145deg, #7DD3FC 0%, #2B8FD6 50%, #1A4E7E 100%)',
  'linear-gradient(145deg, #C4B5FD 0%, #8B5CF6 50%, #4C2A85 100%)', 'linear-gradient(145deg, #9FE3E0 0%, #2BA6A0 50%, #145A57 100%)',
];

interface Kpi {
  metrics: Metrics; tier: TierInfo; tiers: Tier[];
  goals: { today: { done: number; target: number; bonus: number }; week: { done: number; target: number; bonus: number }; month?: { earned: number; target: number; max: number } };
  achievements: { icon: string; title: string; desc: string; progress: number; target: number }[];
}

export default function KpiPage() {
  const [k, setK] = useState<Kpi | null>(null);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'level' | 'goals' | 'kpi' | 'awards'>('level');
  const show = (t: typeof tab) => !isMobile || tab === t;
  useEffect(() => { getKpi().then(setK).catch(() => {}); }, []);
  if (!k) return <Spinner />;
  const { metrics: m, tier, tiers } = k;
  const cur = tier.current;
  const next = tier.next;
  // Сколько бы врач заработал за месяц на следующем уровне
  const gross30 = cur.percent ? Math.round(m.earned_month / (cur.percent / 100)) : 0;
  const extra = next ? Math.round(gross30 * (next.percent - cur.percent) / 100) : 0;

  const kpis = [
    { l: 'Рейтинг', v: m.rating.toFixed(2), sub: `${m.reviews} оценок`, target: '≥ 4.9', ok: m.rating >= 4.9, icon: 'star', pct: Math.max(0, Math.min(1, (m.rating - 4) / 1)) },
    { l: 'Возвращаемость', v: `${m.return_rate}%`, sub: `${m.clients} клиентов`, target: '≥ 40%', ok: m.return_rate >= 40, icon: 'repeat', pct: Math.min(1, m.return_rate / 60) },
    { l: 'Скорость принятия', v: `${m.avg_accept_min ?? '—'} мин`, sub: 'от заказа до «Принять»', target: '≤ 5 мин', ok: (m.avg_accept_min ?? 99) <= 5, icon: 'bolt', pct: Math.max(0, Math.min(1, 1 - ((m.avg_accept_min ?? 10) - 1) / 10)) },
    { l: 'Принятие заказов', v: `${m.acceptance_rate}%`, sub: 'за 30 дней', target: '≥ 80%', ok: m.acceptance_rate >= 80, icon: 'check', pct: m.acceptance_rate / 100 },
    { l: 'Визитов за 30 дней', v: String(m.completed_30d), sub: `всего ${m.completed_total}`, target: '≥ 40', ok: m.completed_30d >= 40, icon: 'orders', pct: Math.min(1, m.completed_30d / 60) },
    { l: 'Часов на линии', v: `${m.hours_30d} ч`, sub: 'за 30 дней', target: '≥ 100 ч', ok: m.hours_30d >= 100, icon: 'clock', pct: Math.min(1, m.hours_30d / 160) },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title="Мой уровень и KPI" sub="Чем больше визитов и выше оценки — тем большую долю от заказа вы получаете" />

      <Segmented className="md:hidden" value={tab} onChange={setTab} options={[
        { k: 'level', label: 'Уровень' }, { k: 'goals', label: 'Цели' }, { k: 'kpi', label: 'KPI' }, { k: 'awards', label: 'Награды' },
      ]} />

      {show('level') && <>
      {/* ═══ Медаль и шкала ═══ */}
      <section className="card-warm !p-6 md:!p-8">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: `${cur.color}33` }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="medal-shine w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-6xl flex-shrink-0 mx-auto md:mx-0"
            style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${cur.color} 45%, ${cur.color}99)`, boxShadow: `0 0 60px ${cur.color}66, inset 0 -6px 18px #0004` }}>
            {cur.icon}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="eyebrow">Ваш уровень</div>
            <div className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: cur.color }}>{cur.name}</div>
            <div className="mt-2 text-white/75">Вы получаете <b className="text-green-300 text-xl">{cur.percent}%</b> от стоимости каждого визита</div>
          </div>
          {next && (
            <div className="rounded-3xl bg-black/25 border border-white/10 p-4 md:max-w-[260px]">
              <div className="text-xs text-white/50">Следующий уровень</div>
              <div className="text-xl font-black" style={{ color: next.color }}>{next.icon} {next.name} · {next.percent}%</div>
              <div className="text-sm text-white/70 mt-1.5">На этом уровне вы бы получили за последний месяц на <b className="text-green-300">{rub(extra)}</b> больше</div>
            </div>
          )}
        </div>
        <div className="relative mt-6 md:mt-4"><TierScale tiers={tiers} completed={m.completed_total} /></div>
      </section>

      {/* ═══ Что нужно для следующего уровня ═══ */}
      {next ? (
        <section className="card">
          <div className="font-black text-lg mb-4">Что нужно для уровня «{next.name}»</div>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { ok: m.completed_total >= next.minOrders, t: `${next.minOrders} выполненных визитов`, s: m.completed_total >= next.minOrders ? 'Выполнено' : `У вас ${m.completed_total} — осталось ${tier.orders_to_next} ${plural(tier.orders_to_next, 'визит', 'визита', 'визитов')}`, p: Math.min(1, m.completed_total / next.minOrders) },
              { ok: m.rating >= next.minRating, t: `Средняя оценка от ${next.minRating}`, s: m.rating >= next.minRating ? `У вас ${m.rating.toFixed(2)} — отлично` : `У вас ${m.rating.toFixed(2)} — нужно поднять на ${(next.minRating - m.rating).toFixed(2)}`, p: Math.min(1, Math.max(0, (m.rating - 4) / (next.minRating - 4))) },
            ].map((r) => (
              <div key={r.t} className={`rounded-2xl p-4 border ${r.ok ? 'border-green-400/30 bg-green-500/[0.07]' : 'border-white/10 bg-black/15'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.ok ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'}`}>
                    <Icon name={r.ok ? 'check' : 'target'} size={16} stroke={2.6} />
                  </span>
                  <div className="flex-1"><div className="font-bold">{r.t}</div><div className="text-xs text-white/55">{r.s}</div></div>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden"><div className="h-full rounded-full bg-green-500" style={{ width: `${r.p * 100}%` }} /></div>
              </div>
            ))}
          </div>
          {!tier.rating_ok_for_next && (
            <p className="text-sm text-amber-100/70 mt-4">💡 Совет: напишите клиенту в чат на следующий день после визита — врачи, которые так делают, получают больше пятёрок и чаще возвращающихся клиентов.</p>
          )}
        </section>
      ) : (
        <section className="card text-center"><div className="text-3xl">👑</div><div className="font-black text-lg mt-1">Вы на высшем уровне!</div><p className="text-white/55 text-sm">Сохраняйте рейтинг от 4.9, чтобы оставаться на «Платине».</p></section>
      )}

      {/* ═══ Все уровни ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiers.map((t) => {
          const isCur = t.key === cur.key;
          const reached = m.completed_total >= t.minOrders && m.rating >= t.minRating;
          return (
            <div key={t.key} className={`rounded-3xl p-4 border transition-all ${isCur ? 'scale-[1.02]' : ''}`}
              style={{ borderColor: isCur ? t.color : 'rgba(255,255,255,0.1)', background: isCur ? `linear-gradient(160deg, ${t.color}26, transparent)` : 'rgba(255,255,255,0.03)', boxShadow: isCur ? `0 0 30px ${t.color}33` : undefined }}>
              <div className="flex items-center justify-between">
                <span className={`text-3xl ${reached ? '' : 'grayscale opacity-50'}`}>{t.icon}</span>
                {isCur && <span className="chip bg-white text-[#1E140D]">Вы здесь</span>}
              </div>
              <div className="font-black mt-2" style={{ color: t.color }}>{t.name}</div>
              <div className="text-3xl font-black">{t.percent}%</div>
              <div className="text-[11px] text-white/50 mt-1">{t.minOrders ? `от ${t.minOrders} визитов` : 'с первого визита'}{t.minRating ? ` · рейтинг ${t.minRating}+` : ''}</div>
            </div>
          );
        })}
      </section>

      </>}

      {show('goals') && <>
      {/* ═══ Призовой фонд — дополнительный KPI ═══ */}
      <PrizeFund />

      {/* ═══ Цели ═══ */}
      <section className="grid md:grid-cols-2 gap-3">
        {[
          { l: 'Цель дня', g: k.goals.today, c: '#7CB842' },
          { l: 'Цель недели', g: k.goals.week, c: '#FACC15' },
        ].map(({ l, g, c }) => (
          <div key={l} className="card flex items-center gap-5">
            <Ring value={g.done} max={g.target} color={c}>
              <div className="text-xl font-black leading-none">{g.done}<span className="text-white/40 text-sm">/{g.target}</span></div>
            </Ring>
            <div>
              <div className="eyebrow">{l}</div>
              <div className="text-lg font-black mt-0.5">{g.done >= g.target ? 'Цель выполнена! 🎉' : `Ещё ${g.target - g.done} ${plural(g.target - g.done, 'визит', 'визита', 'визитов')}`}</div>
              <div className="text-sm text-white/55">Бонус за выполнение: <b className="text-[#FACC15] whitespace-nowrap">+{rub(g.bonus)}</b></div>
            </div>
          </div>
        ))}
      </section>

      {/* ═══ План месяца по доходу ═══ */}
      {k.goals.month && (() => {
        const g = k.goals.month!;
        const now = new Date();
        const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const forecast = Math.round(g.earned / now.getDate() * daysIn);
        const pct = Math.min(100, (g.earned / g.max) * 100);
        return (
          <section className="card">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <div className="eyebrow">План месяца · {now.toLocaleDateString(LOC, { month: 'long' })}</div>
                <div className="text-2xl md:text-3xl font-black mt-1">{rub(g.earned)} <span className="block md:inline text-white/40 text-lg whitespace-nowrap">из 150–180 тыс. ₽</span></div>
              </div>
              <div className="text-sm text-white/65">Прогноз на месяц: <b className={forecast >= g.target ? 'text-green-300' : 'text-[#FACC15]'}>{rub(forecast)}</b></div>
            </div>
            <div className="relative h-3 rounded-full bg-white/10 mt-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6EA83A, #9BCD67)' }} />
              <div className="absolute inset-y-0 w-0.5 bg-white/60" style={{ left: `${(g.target / g.max) * 100}%` }} />
            </div>
            {/* План: по строкам — период слева, сумма справа, ничего не тесно и не вылезает */}
            <div className="mt-4 rounded-2xl bg-black/20 border border-white/10 divide-y divide-white/[0.07]">
              {[
                { l: 'В день', v: '≈ 5 выездов', sum: '6\u00A0800 – 8\u00A0200\u00A0₽' },
                { l: 'В неделю', v: '≈ 25 выездов', sum: '35\u00A0000 – 42\u00A0000\u00A0₽' },
                { l: 'В месяц', v: '≈ 110 выездов', sum: '150\u00A0000 – 180\u00A0000\u00A0₽' },
                { l: 'В год', v: '≈ 1\u00A0300 выездов', sum: '1,8 – 2,2\u00A0млн\u00A0₽' },
              ].map((x) => (
                <div key={x.l} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-bold leading-tight">{x.l}</div>
                    <div className="text-xs text-white/45 leading-tight mt-0.5">{x.v}</div>
                  </div>
                  <div className="money font-black text-[15px] md:text-base text-green-300 text-right">{x.sum}</div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      </>}

      {show('kpi') && <>
      {/* ═══ KPI ═══ */}
      <section>
        <h2 className="text-xl font-black mb-3">Мои показатели</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map((x) => (
            <div key={x.l} className="card !p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-white/55 uppercase tracking-wider min-w-0 leading-tight"><Icon name={x.icon} size={14} className="flex-shrink-0" />{x.l}</span>
                <span className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${x.ok ? 'bg-green-500/20 text-green-300' : 'bg-[#FACC15]/15 text-[#FACC15]'}`}>
                  <Icon name={x.ok ? 'check' : 'target'} size={12} stroke={3} />
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black mt-2">{x.v}</div>
              <div className="h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${x.pct * 100}%`, background: x.ok ? '#7CB842' : '#FACC15' }} />
              </div>
              <div className="flex justify-between text-[11px] text-white/45 mt-1.5"><span>{x.sub}</span><span>цель {x.target}</span></div>
            </div>
          ))}
        </div>
      </section>

      </>}

      {show('awards') && <>
      {/* ═══ Достижения ═══ */}
      <section>
        <h2 className="text-xl font-black mb-3">Достижения <span className="text-white/40 text-base font-bold">{k.achievements.filter((a) => a.progress >= a.target).length}/{k.achievements.length}</span></h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {k.achievements.map((a, i) => {
            const done = a.progress >= a.target;
            return (
              <div key={a.title} className={`relative overflow-hidden rounded-[22px] p-4 text-center ${done ? 'tile3d' : 'border border-white/10 bg-white/[0.03]'}`}
                style={done ? { background: AWARD_BG[i % AWARD_BG.length] } : undefined}>
                {done && <span className="tile3d-gloss" />}
                <div className={`relative text-[44px] leading-none ${done ? '' : 'grayscale opacity-40'}`} style={done ? { filter: 'drop-shadow(0 8px 8px rgba(0,0,0,.35))' } : undefined}>{a.icon}</div>
                <div className={`relative font-black mt-2 text-sm ${done ? 'text-white' : 'text-white/60'}`} style={done ? { textShadow: '0 1px 2px rgba(0,0,0,.35)' } : undefined}>{a.title}</div>
                <div className={`relative text-[11px] mt-0.5 leading-snug min-h-[28px] ${done ? 'text-white/85' : 'text-white/45'}`}>{a.desc}</div>
                {!done && a.target > 1 && (
                  <><div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden"><div className="h-full bg-[#FACC15]" style={{ width: `${(a.progress / a.target) * 100}%` }} /></div>
                  <div className="text-[10px] text-white/40 mt-1">{a.progress} / {a.target}</div></>
                )}
                {done && <div className="relative inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/90 text-[#1E140D] text-[10px] font-black uppercase tracking-wider">Получено</div>}
              </div>
            );
          })}
        </div>
      </section>
      </>}
    </div>
  );
}
