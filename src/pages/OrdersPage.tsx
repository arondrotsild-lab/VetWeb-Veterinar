import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Empty, OrderCard, PageTitle, Segmented, Spinner, Stars, StatusChip } from '../components/ui';
import { useVet } from '../lib/vet';
import { acceptOrder, declineOrder, errText, getOrders, Order } from '../lib/api';
import { rub, dateLong, time, speciesEmoji } from '../lib/format';
import Icon3D from '../components/Icon3D';

type Tab = 'new' | 'active' | 'history';

export default function OrdersPage() {
  const { feed, online, refresh, setOnline } = useVet();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'new';
  const navigate = useNavigate();
  const [history, setHistory] = useState<Order[] | null>(null);
  const [limit, setLimit] = useState(15);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (tab === 'history' && !history) getOrders('history').then(setHistory).catch(() => setHistory([])); }, [tab, history]);

  const incoming = feed?.incoming ?? [];
  const active = feed?.active ?? [];

  const accept = async (id: number) => {
    setBusy(id); setMsg('');
    try { await acceptOrder(id); await refresh(); navigate(`/orders/${id}`); }
    catch (e) { setMsg(errText(e)); refresh(); } finally { setBusy(null); }
  };
  const decline = async (id: number) => { setBusy(id); await declineOrder(id).catch(() => {}); await refresh(); setBusy(null); };

  // История, сгруппированная по дням
  const groups = useMemo(() => {
    const g: { day: string; items: Order[]; sum: number }[] = [];
    for (const o of (history ?? []).slice(0, limit)) {
      const day = dateLong(o.completed_at || o.scheduled_at);
      let cur = g[g.length - 1];
      if (!cur || cur.day !== day) { cur = { day, items: [], sum: 0 }; g.push(cur); }
      cur.items.push(o);
      cur.sum += o.vet_payout || 0;
    }
    return g;
  }, [history, limit]);

  const tabs: { k: Tab; l: string; n?: number }[] = [
    { k: 'new', l: 'Новые', n: online ? incoming.length : undefined },
    { k: 'active', l: 'В работе', n: active.length },
    { k: 'history', l: 'История' },
  ];

  return (
    <div>
      <PageTitle title="Заказы" sub="Новые вызовы рядом с вами, заказы в работе и вся история визитов" />
      <Segmented className="mb-4 md:max-w-md" value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })}
        options={tabs.map((t) => ({ k: t.k, label: t.l, badge: t.n }))} />
      {msg && <div className="mb-4 text-sm text-red-300">{msg}</div>}

      {tab === 'new' && (
        !online ? (
          <Empty icon="😴" title="Вы не на линии" text="Новые заказы видны только врачам на линии.">
            <button onClick={() => setOnline(true)} className="btn-green">Выйти на линию</button>
          </Empty>
        ) : incoming.length === 0 ? (
          <Empty icon="🛰️" title="Пока нет новых заказов" text="Лента обновляется автоматически каждые 5 секунд." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {incoming.map((o) => <OrderCard key={o.id} o={o} busy={busy === o.id} onAccept={() => accept(o.id)} onDecline={() => decline(o.id)} />)}
          </div>
        )
      )}

      {tab === 'active' && (
        active.length === 0
          ? <Empty icon="🩺" title="Нет заказов в работе" text="Принятые заказы появятся здесь — с маршрутом, медкартой и кнопками этапов визита." />
          : <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">{active.map((o) => <OrderCard key={o.id} o={{ ...o, payout_estimate: o.payout_estimate ?? Math.round(((o.total_price || 0) + (o.bonus_used || 0)) * (feed?.percent || 55) / 100) }} />)}</div>
      )}

      {tab === 'history' && (
        !history ? <Spinner /> : history.length === 0 ? <Empty icon="📋" title="История пуста" text="Здесь появятся все выполненные визиты." /> : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.day}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-sm font-bold text-white/60 capitalize">{g.day}</div>
                  <div className="text-sm font-bold text-green-300">+{rub(g.sum)}</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] divide-y divide-white/[0.06] overflow-hidden">
                  {g.items.map((o) => (
                    <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-colors">
                      <Icon3D emoji={speciesEmoji(o.pet_species)} size={44} still />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold leading-snug">{o.service_name} · {o.pet_name}</div>
                        <div className="text-xs text-white/45 leading-snug">{time(o.completed_at || o.scheduled_at)} · {o.client_name}</div>
                        {o.client_rating && <div className="mt-1"><Stars value={o.client_rating} size={12} /></div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {o.status === 'completed' ? (
                          <><div className="font-black text-green-300 whitespace-nowrap">+{rub(o.vet_payout)}</div><div className="text-[11px] text-white/40 whitespace-nowrap">{o.vet_percent}% от {rub((o.total_price || 0) + (o.bonus_used || 0))}</div></>
                        ) : <StatusChip status={o.status} />}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {history.length > limit && (
              <button onClick={() => setLimit((l) => l + 15)} className="btn-ghost w-full py-3">Показать ещё · осталось {history.length - limit}</button>
            )}
          </div>
        )
      )}
    </div>
  );
}
