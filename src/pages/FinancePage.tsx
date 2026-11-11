import { useCallback, useEffect, useState } from 'react';
import { LOC } from '../lib/i18n';
import Icon from '../components/Icon';
import { Modal, PageTitle, Segmented, Spinner } from '../components/ui';
import { addExpense, deleteExpense, errText, getFinance, requestPayout } from '../lib/api';
import { useVet } from '../lib/vet';
import { rub, dateShort, time, useIsMobile } from '../lib/format';

interface Fin {
  summary: { orders: number; gross: number; earned: number; platform_fee: number; expenses: number; net: number; avg_check: number; avg_percent: number };
  expense_by_category: { category: string; label: string; amount: number }[];
  series: { date: string; earned: number; expenses: number }[];
  transactions: { kind: 'income' | 'expense' | 'payout'; id: number; amount: number; at: string; title: string; subtitle?: string; percent?: number; category_label?: string }[];
  balance: number;
  categories: Record<string, string>;
}

const INCOME = '#6EA83A';
const EXPENSE = '#A8553A';
const CAT_ICON: Record<string, string> = { fuel: '⛽', materials: '🧤', drugs: '💊', education: '🎓', phone: '📱', other: '📦' };

// Столбики «заработано / потрачено» по дням (или месяцам) с подсказкой при наведении
function Bars({ series, period }: { series: Fin['series']; period: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((s) => Math.max(s.earned, s.expenses)));
  const H = 180;
  const fmt = (d: string) => period === 'year'
    ? new Date(d).toLocaleDateString(LOC, { month: 'short' })
    : new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: period === 'week' ? 'short' : undefined });
  const ticks = [0, 0.5, 1].map((t) => Math.round((max * t) / 100) * 100);
  const step = series.length > 14 ? Math.ceil(series.length / 8) : 1;
  return (
    <div className="relative">
      <div className="flex gap-4 text-xs text-white/70 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px]" style={{ background: INCOME }} />Заработано</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px]" style={{ background: EXPENSE }} />Расходы</span>
      </div>
      <div className="relative flex">
        <div className="flex flex-col justify-between text-[10px] text-white/35 pr-2 text-right tabular-nums" style={{ height: H }}>
          {[...ticks].reverse().map((t) => <span key={t}>{t >= 1000 ? `${Math.round(t / 100) / 10}k` : t}</span>)}
        </div>
        <div className="relative flex-1">
          {[0, 0.5, 1].map((t) => <div key={t} className="absolute inset-x-0 border-t border-white/[0.07]" style={{ top: H * t }} />)}
          <div className="relative flex items-end gap-[3px] md:gap-1.5" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {series.map((s, i) => (
              <div key={s.date} className="flex-1 h-full flex items-end justify-center gap-[2px] cursor-default rounded-md"
                style={{ background: hover === i ? 'rgba(255,255,255,0.05)' : undefined }}
                onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                <div className="w-1/2 max-w-[14px] rounded-t-[4px] transition-all duration-700" style={{ height: `${(s.earned / max) * 100}%`, background: INCOME, minHeight: s.earned ? 3 : 0 }} />
                <div className="w-1/2 max-w-[14px] rounded-t-[4px] transition-all duration-700" style={{ height: `${(s.expenses / max) * 100}%`, background: EXPENSE, minHeight: s.expenses ? 3 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-[3px] md:gap-1.5 mt-2">
            {series.map((s, i) => <div key={s.date} className="flex-1 text-center text-[9px] md:text-[10px] text-white/35 whitespace-nowrap overflow-visible">{i % step === 0 ? fmt(s.date) : ''}</div>)}
          </div>
          {hover !== null && series[hover] && (
            <div className="absolute -top-2 z-10 pointer-events-none rounded-xl bg-[#170F0A] border border-white/15 px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((hover + 0.5) / series.length) * 100}%`, transform: `translate(${hover > series.length / 2 ? '-100%' : '0'}, -100%)` }}>
              <div className="font-bold text-white mb-1">{period === 'year' ? new Date(series[hover].date).toLocaleDateString(LOC, { month: 'long', year: 'numeric' }) : new Date(series[hover].date).toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'long' })}</div>
              <div className="flex items-center gap-2 text-white/80"><span className="w-2 h-2 rounded-sm" style={{ background: INCOME }} />Заработано: <b>{rub(series[hover].earned)}</b></div>
              <div className="flex items-center gap-2 text-white/80"><span className="w-2 h-2 rounded-sm" style={{ background: EXPENSE }} />Расходы: <b>{rub(series[hover].expenses)}</b></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { refresh } = useVet();
  const [period, setPeriod] = useState('month');
  const [d, setD] = useState<Fin | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [exp, setExp] = useState({ category: 'fuel', amount: '', note: '' });
  const [payAmount, setPayAmount] = useState('');
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'payout'>('all');
  const [limit, setLimit] = useState(10);
  // На телефоне страница разбита на вкладки, на компьютере видно всё сразу
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'overview' | 'chart' | 'expenses' | 'ops'>('overview');
  const show = (k: typeof tab) => !isMobile || tab === k;

  const load = useCallback(() => getFinance(period).then(setD).catch(() => {}), [period]);
  useEffect(() => { load(); }, [load]);

  if (!d) return <Spinner />;
  const s = d.summary;
  const periodLabel = period === 'week' ? 'за 7 дней' : period === 'month' ? 'за 30 дней' : 'за год';
  const expTotal = Math.max(1, s.expenses);

  const saveExpense = async () => {
    setErr('');
    try { await addExpense({ category: exp.category, amount: Number(exp.amount), note: exp.note }); setAddOpen(false); setExp({ category: 'fuel', amount: '', note: '' }); load(); }
    catch (e) { setErr(errText(e)); }
  };
  const payout = async () => {
    setErr('');
    try { await requestPayout(Number(payAmount) || d.balance); setPayOpen(false); load(); refresh(); }
    catch (e) { setErr(errText(e)); }
  };

  const tx = d.transactions.filter((t) => filter === 'all' || t.kind === filter);

  return (
    <div className="space-y-5">
      <PageTitle title="Доход и расходы" sub="Сколько вы заработали, сколько потратили и что осталось чистыми"
        right={<button onClick={() => setAddOpen(true)} className="btn-terra"><Icon name="plus" size={18} />Добавить расход</button>} />

      <Segmented className="md:hidden" value={tab} onChange={setTab} options={[
        { k: 'overview', label: 'Обзор' }, { k: 'chart', label: 'График' }, { k: 'expenses', label: 'Расходы' }, { k: 'ops', label: 'Операции' },
      ]} />

      {/* Баланс */}
      {show('overview') && <section className="card-warm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-green-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <div className="eyebrow">Доступно к выводу</div>
            <div className="money text-[clamp(2.25rem,11vw,3.75rem)] font-black mt-1 tracking-tight leading-none">{rub(d.balance)}</div>
            <div className="text-sm text-white/55 mt-1.5">Выплаты на карту — каждый день, без комиссии</div>
          </div>
          <div className="grid grid-cols-1 md:flex gap-2">
            <button onClick={() => { setPayAmount(String(d.balance)); setPayOpen(true); }} className="btn-yellow py-4 px-6 text-base whitespace-nowrap"><Icon name="card" size={20} />Вывести на карту</button>
            <button onClick={() => setAddOpen(true)} className="btn-ghost md:hidden py-3 whitespace-nowrap"><Icon name="plus" size={18} />Добавить расход</button>
          </div>
        </div>
      </section>}

      {/* Период */}
      {tab !== 'ops' || !isMobile ? (
        <div className="grid grid-cols-3 gap-2 md:flex">
          {[['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${period === k ? 'bg-white text-[#1E140D]' : 'bg-white/[0.06] text-white/70 border border-white/10 hover:bg-white/10'}`}>{l}</button>
          ))}
        </div>
      ) : null}

      {/* Итоги */}
      {show('overview') && <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4 col-span-2 lg:col-span-1 border-green-400/30" style={{ background: 'linear-gradient(135deg, rgba(110,168,58,0.18), rgba(110,168,58,0.04))' }}>
          <div className="text-[11px] text-white/55 uppercase tracking-wider">Чистыми {periodLabel}</div>
          <div className={`money text-[clamp(1.6rem,8vw,1.875rem)] font-black mt-1 ${s.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>{rub(s.net)}</div>
          <div className="text-[11px] text-white/45 mt-1">заработано минус расходы</div>
        </div>
        <div className="card !p-4">
          <div className="text-[11px] text-white/55 uppercase tracking-wider">Заработано</div>
          <div className="money text-[clamp(1.15rem,5.6vw,1.5rem)] font-black mt-1">{rub(s.earned)}</div>
          <div className="text-[11px] text-white/45 mt-1">{s.orders} визитов · средн. {s.avg_percent || 0}%</div>
        </div>
        <div className="card !p-4">
          <div className="text-[11px] text-white/55 uppercase tracking-wider">Потрачено</div>
          <div className="money text-[clamp(1.15rem,5.6vw,1.5rem)] font-black mt-1">{rub(s.expenses)}</div>
          <div className="text-[11px] text-white/45 mt-1">бензин, материалы и др.</div>
        </div>
        <div className="card !p-4 col-span-2 lg:col-span-1">
          <div className="text-[11px] text-white/55 uppercase tracking-wider">Оборот визитов</div>
          <div className="money text-[clamp(1.15rem,5.6vw,1.5rem)] font-black mt-1">{rub(s.gross)}</div>
          <div className="text-[11px] text-white/45 mt-1">средний чек {rub(s.avg_check)} · сервис {rub(s.platform_fee)}</div>
        </div>
      </section>}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
        {show('chart') && <section className="card">
          <div className="font-black mb-1">Динамика {periodLabel}</div>
          <p className="text-xs text-white/45 mb-4">{isMobile ? 'Нажмите на столбик, чтобы увидеть суммы' : 'Наведите на столбик, чтобы увидеть суммы'}</p>
          <Bars series={d.series} period={period} />
          {isMobile && (
            <div className="grid grid-cols-3 gap-2 mt-5 text-center">
              <div className="rounded-2xl bg-black/20 border border-white/10 py-2.5"><div className="text-[10px] text-white/50 uppercase">Заработано</div><div className="money font-black text-[15px] text-green-300">{rub(s.earned)}</div></div>
              <div className="rounded-2xl bg-black/20 border border-white/10 py-2.5"><div className="text-[10px] text-white/50 uppercase">Расходы</div><div className="money font-black text-[15px] text-[#E39A78]">{rub(s.expenses)}</div></div>
              <div className="rounded-2xl bg-black/20 border border-white/10 py-2.5"><div className="text-[10px] text-white/50 uppercase">Чистыми</div><div className="money font-black text-[15px]">{rub(s.net)}</div></div>
            </div>
          )}
        </section>}

        {show('expenses') && <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-black">На что ушли деньги</div>
            <button onClick={() => setAddOpen(true)} className="text-xs font-bold text-green-300 hidden md:block">+ Добавить</button>
          </div>
          {d.expense_by_category.length === 0 ? <p className="text-sm text-white/50">Расходов за период нет.</p> : (
            <div className="space-y-3.5">
              {d.expense_by_category.map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-white/85"><span>{CAT_ICON[c.category] ?? '📦'}</span>{c.label}</span>
                    <span className="font-bold tabular-nums">{rub(c.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.amount / expTotal) * 100}%`, background: EXPENSE }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-white/10 text-xs text-white/50 leading-relaxed">
            💡 Записывайте расходы на бензин и материалы — так вы видите реальный доход, а в конце года проще посчитать налог самозанятого.
          </div>
          {isMobile && <button onClick={() => setAddOpen(true)} className="btn-terra w-full mt-4"><Icon name="plus" size={18} />Добавить расход</button>}
        </section>}
      </div>

      {/* Операции */}
      {show('ops') && <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="font-black">Операции</div>
          <div className="grid grid-cols-4 gap-1.5 sm:flex">
            {[['all', 'Все'], ['income', 'Доход'], ['expense', 'Расходы'], ['payout', 'Выплаты']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k as typeof filter)} className={`px-2 sm:px-3 py-2 sm:py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === k ? 'bg-green-500 text-white' : 'bg-white/[0.06] text-white/60'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {tx.slice(0, limit).map((t) => (
            <div key={`${t.kind}-${t.id}`} className="flex items-center gap-3 py-3 group">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${t.kind === 'income' ? 'bg-green-500/15' : t.kind === 'expense' ? 'bg-[#A8553A]/20' : 'bg-[#FACC15]/15'}`}>
                {t.kind === 'income' ? '🩺' : t.kind === 'payout' ? '💳' : '🧾'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold leading-snug">
                  {t.kind === 'income' ? `${t.title} · ${t.subtitle ?? ''}` : t.kind === 'expense' ? (t.category_label + (t.title ? ` · ${t.title}` : '')) : t.title}
                </div>
                <div className="text-xs text-white/45">{dateShort(t.at)}, {time(t.at)}{t.kind === 'income' && t.percent ? ` · ваша доля ${t.percent}%` : ''}{t.kind === 'payout' ? (t.subtitle === 'processing' ? ' · в обработке' : ' · зачислено') : ''}</div>
              </div>
              <div className={`font-black tabular-nums whitespace-nowrap flex-shrink-0 ${t.kind === 'income' ? 'text-green-300' : t.kind === 'expense' ? 'text-[#E39A78]' : 'text-white/70'}`}>
                {t.kind === 'income' ? '+' : '−'}{rub(t.amount)}
              </div>
              {t.kind === 'expense' && (
                <button onClick={async () => { if (confirm('Удалить расход?')) { await deleteExpense(t.id); load(); } }}
                  className="md:opacity-0 md:group-hover:opacity-100 text-white/40 hover:text-red-300 transition-opacity p-1" aria-label="Удалить"><Icon name="trash" size={16} /></button>
              )}
            </div>
          ))}
          {tx.length === 0 && <p className="text-sm text-white/50 py-4">Операций нет.</p>}
        </div>
        {tx.length > limit && (
          <button onClick={() => setLimit((l) => l + 20)} className="btn-ghost w-full mt-3 py-2.5 text-sm">Показать ещё</button>
        )}
      </section>}

      {/* Добавить расход */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Новый расход">
        <label className="label">Категория</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(d.categories).map(([k, l]) => (
            <button key={k} onClick={() => setExp({ ...exp, category: k })}
              className={`rounded-2xl p-3 text-center border transition-all ${exp.category === k ? 'border-green-400 bg-green-500/15' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'}`}>
              <div className="text-2xl">{CAT_ICON[k]}</div>
              <div className="text-[11px] font-semibold mt-1 leading-tight">{l}</div>
            </button>
          ))}
        </div>
        <label className="label">Сумма, ₽</label>
        <input className="input text-2xl font-black" inputMode="numeric" autoFocus value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value.replace(/\D/g, '') })} placeholder="0" />
        <label className="label mt-4">Комментарий</label>
        <input className="input" value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} placeholder="Например: АЗС на Ленинском" />
        {err && <div className="text-sm text-red-300 mt-3">{err}</div>}
        <button onClick={saveExpense} className="btn-terra w-full mt-5 py-4">Сохранить расход</button>
      </Modal>

      {/* Вывод */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Вывод на карту">
        <div className="rounded-2xl bg-black/25 border border-white/10 p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div className="flex-1"><div className="font-bold">Карта •••• 4417</div><div className="text-xs text-white/50">Зачисление в течение дня</div></div>
        </div>
        <label className="label">Сумма, ₽ (доступно {rub(d.balance)})</label>
        <input className="input text-2xl font-black" inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))} />
        {err && <div className="text-sm text-red-300 mt-3">{err}</div>}
        <button onClick={payout} className="btn-yellow w-full mt-5 py-4 text-base">Вывести {rub(Number(payAmount) || 0)}</button>
      </Modal>
    </div>
  );
}
