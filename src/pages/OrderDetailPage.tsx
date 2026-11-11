import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Avatar, Modal, Segmented, Spinner, Stars, StatusChip } from '../components/ui';
import { useVet } from '../lib/vet';
import { acceptOrder, declineOrder, errText, getOrder, nextStep, OrderDetail, releaseOrder } from '../lib/api';
import { rub, when, time, dateShort, speciesEmoji, STATUS, STEPS, URGENCY, useIsMobile } from '../lib/format';

const STEP_LABEL: Record<string, string> = { confirmed: 'Принят', on_the_way: 'В пути', arrived: 'На месте', in_progress: 'Приём', completed: 'Готово' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useVet();
  const [o, setO] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [finish, setFinish] = useState(false);
  const [conclusion, setConclusion] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [done, setDone] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'pet' | 'client' | 'log'>('pet');
  const [allVisits, setAllVisits] = useState(false);
  const show = (t: typeof tab) => !isMobile || tab === t;

  const load = useCallback(() => getOrder(Number(id)).then((d) => { setO(d); setErr(''); }).catch((e) => setErr(errText(e))), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (params.get('finish') && o?.status === 'in_progress') { setFinish(true); setParams({}, { replace: true }); }
  }, [params, o?.status, setParams]);
  useEffect(() => { if (o && !finalPrice) setFinalPrice(String((o.total_price || 0) + (o.bonus_used || 0))); }, [o, finalPrice]);

  if (err) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">🐾</div>
      <div className="text-xl font-black">{err}</div>
      <Link to="/orders" className="btn-ghost mt-6">К заказам</Link>
    </div>
  );
  if (!o) return <Spinner />;

  const price = (o.total_price || 0) + (o.bonus_used || 0);
  const isPending = o.status === 'pending' && !o.is_mine;
  const stepIdx = STEPS.indexOf(o.status);
  const tri = o.ai_triage;
  const urg = tri?.urgency ? URGENCY[tri.urgency as string] : null;

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setErr('');
    try { await fn(); await Promise.all([load(), refresh()]); after?.(); }
    catch (e) { alert(errText(e)); } finally { setBusy(false); }
  };

  const doNext = () => {
    if (o.status === 'in_progress') { setFinish(true); return; }
    run(() => nextStep(o.id));
  };
  const doFinish = () => run(async () => {
    await nextStep(o.id, { conclusion, final_price: Number(finalPrice) || undefined });
  }, () => { setFinish(false); setDone(Math.round((Number(finalPrice) || price) * o.percent / 100)); });

  return (
    <div className="space-y-5">
      {/* ═══ Шапка ═══ */}
      <section className="card-warm">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-start gap-3 md:gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="eyebrow">Заказ №{o.id}</span>
              <StatusChip status={o.status} />
              {o.service_name === 'Скорая ветпомощь' && <span className="chip bg-red-500/15 text-red-300 border border-red-400/30">🚨 Срочно</span>}
            </div>
            <h1 className="text-2xl md:text-4xl font-black mt-2 tracking-tight leading-tight">{o.service_name}</h1>
            <div className="mt-2 md:mt-3 flex flex-col gap-1 md:gap-1.5 text-sm md:text-base text-white/75">
              <div className="flex items-center gap-2"><Icon name="clock" size={17} className="text-amber-300" />{when(o.scheduled_at)}</div>
              <div className="flex items-start gap-2"><Icon name="pin" size={17} className="text-amber-300 mt-0.5" />{o.address}</div>
            </div>
          </div>
          <div className="md:text-right rounded-2xl md:rounded-3xl bg-black/25 border border-white/10 px-4 py-3 md:p-4 md:min-w-[220px]">
            <div className="text-[11px] text-white/50 uppercase tracking-wider">{o.status === 'completed' ? 'Вы заработали' : 'Вы получите'}</div>
            <div className="money text-3xl md:text-4xl font-black text-green-300 mt-0.5">{rub(o.vet_payout ?? o.payout_estimate)}</div>
            <div className="text-xs text-white/45 mt-1">{o.vet_percent ?? o.percent}% от {rub(price)}{o.bonus_used ? ` (бонусами ${rub(o.bonus_used)} — платит ВетДом)` : ''}</div>
          </div>
        </div>

        {/* Этапы */}
        {o.is_mine && o.status !== 'cancelled' && (
          <div className="relative mt-4 md:mt-6">
            <div className="flex items-start">
              {STEPS.map((s, i) => (
                <Fragment key={s}>
                  <div className="flex flex-col items-center w-12 md:w-16 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                      i < stepIdx || o.status === 'completed' ? 'bg-green-500 border-green-400 text-white' : i === stepIdx ? 'bg-[#FACC15] border-[#FDE047] text-[#1E140D] live-pulse' : 'bg-white/5 border-white/15 text-white/40'}`}>
                      {i < stepIdx || o.status === 'completed' ? <Icon name="check" size={15} stroke={3} /> : i + 1}
                    </div>
                    <span className={`mt-1.5 text-[10px] md:text-xs text-center ${i === stepIdx && o.status !== 'completed' ? 'text-white font-bold' : 'text-white/50'}`}>{STEP_LABEL[s]}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-1 mt-[14px] rounded-full ${i < stepIdx ? 'bg-green-500' : 'bg-white/10'}`} />}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="relative mt-6 flex flex-col sm:flex-row gap-2">
          {isPending && <>
            <button onClick={() => run(() => acceptOrder(o.id))} disabled={busy} className="btn-green py-4 text-lg flex-1"><Icon name="check" size={20} stroke={2.6} />Принять заказ</button>
            <button onClick={() => run(() => declineOrder(o.id), () => navigate('/orders'))} disabled={busy} className="btn-ghost">Пропустить</button>
          </>}
          {o.is_mine && STATUS[o.status]?.action && (
            <button onClick={doNext} disabled={busy} className={`${o.status === 'in_progress' ? 'btn-yellow' : 'btn-green'} py-4 text-lg flex-1`}>
              {STATUS[o.status].action}<Icon name="chevron" size={20} />
            </button>
          )}
          {o.is_mine && o.status !== 'completed' && <>
            <a href={`https://yandex.ru/maps/?rtext=~${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer" className="btn-ghost"><Icon name="map" size={18} />Маршрут</a>
            {o.client_phone && <a href={`tel:${o.client_phone}`} className="btn-ghost"><Icon name="phone" size={18} />Позвонить</a>}
          </>}
        </div>
        {o.is_mine && o.status === 'confirmed' && (
          <button onClick={() => { if (confirm('Отказаться от заказа? Он вернётся в общую ленту, и его возьмёт другой врач.')) run(() => releaseOrder(o.id), () => navigate('/orders')); }}
            className="relative mt-3 text-xs text-white/40 hover:text-red-300">Не смогу приехать — отказаться от заказа</button>
        )}
      </section>

      <Segmented className="md:hidden" value={tab} onChange={setTab} options={[{ k: 'pet', label: 'Пациент' }, { k: 'client', label: 'Клиент' }, { k: 'log', label: 'Ход заказа' }]} />

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
        <div className="space-y-5">
          {/* ═══ Пациент ═══ */}
          {show('pet') && <section className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="eyebrow">Пациент</div>
              {o.passport_id && <span className="chip bg-white/[0.06] text-white/70 border border-white/10">Ветпаспорт {o.passport_id}</span>}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
                {o.pet_photo ? <img src={o.pet_photo} alt="" className="w-full h-full object-cover" /> : speciesEmoji(o.pet_species)}
              </div>
              <div>
                <div className="text-2xl font-black">{o.pet_name}</div>
                <div className="text-white/60">{o.pet_species}{o.pet_breed ? ` · ${o.pet_breed}` : ''}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {o.pet_age != null && <span className="chip bg-white/[0.06] text-white/75">{o.pet_age} {o.pet_age === 1 ? 'год' : o.pet_age < 5 ? 'года' : 'лет'}</span>}
                  {o.pet_weight && <span className="chip bg-white/[0.06] text-white/75">{Number(o.pet_weight)} кг</span>}
                  {o.pet_sex && <span className="chip bg-white/[0.06] text-white/75">{o.pet_sex}</span>}
                  {o.pet_color && <span className="chip bg-white/[0.06] text-white/75">{o.pet_color}</span>}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              {[
                { l: 'Жалоба сейчас', v: o.pet_current_concern, c: '#FACC15' },
                { l: 'Диагнозы', v: o.pet_diagnoses, c: '#D9895F' },
                { l: 'Предыдущее лечение', v: o.pet_previous_treatment, c: '#9BCD67' },
                { l: 'Особенности', v: o.pet_notes, c: '#C99A63' },
              ].filter((x) => x.v).map((x) => (
                <div key={x.l} className="rounded-2xl bg-black/20 border border-white/[0.07] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: x.c }}>{x.l}</div>
                  <div className="text-sm text-white/85 mt-1 leading-snug">{x.v}</div>
                </div>
              ))}
            </div>
            {o.pet_microchip && <div className="text-xs text-white/40 mt-3">Микрочип: {o.pet_microchip}</div>}
          </section>}

          {/* ═══ Что рассказал клиент ═══ */}
          {show('client') && (o.notes || tri || o.voice_url) && (
            <section className="card">
              <div className="eyebrow mb-3">Что рассказал клиент</div>
              {o.notes && <p className="text-white/90 text-lg leading-snug">«{o.notes}»</p>}
              {o.voice_url && <audio controls src={o.voice_url} className="w-full mt-3" />}
              {tri && (
                <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: `${urg?.color ?? '#9BCD67'}55`, background: `${urg?.color ?? '#9BCD67'}10` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name="sparkle" size={16} className="text-[#FACC15]" />
                    <span className="text-sm font-black">Оценка ИИ-помощника</span>
                    {urg && <span className="chip" style={{ color: urg.color, border: `1px solid ${urg.color}55` }}>{urg.label}</span>}
                  </div>
                  <p className="text-sm text-white/80">{String(tri.summary || '')}</p>
                  {typeof tri.possible_causes === 'string' && <p className="text-xs text-white/50 mt-2">Возможные причины: {tri.possible_causes}</p>}
                  <p className="text-[11px] text-white/35 mt-2">Предварительная оценка — окончательное решение за врачом.</p>
                </div>
              )}
            </section>
          )}

          {/* ═══ Заключение / отзыв ═══ */}
          {show('log') && o.status === 'completed' && (
            <section className="card">
              <div className="eyebrow mb-2">Ваше заключение</div>
              <p className="text-white/85">{o.vet_conclusion || 'Заключение не добавлено'}</p>
              {o.client_rating && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <div className="eyebrow mb-2">Отзыв клиента</div>
                  <Stars value={o.client_rating} size={18} />
                  {o.client_review && <p className="text-white/80 mt-2 italic">«{o.client_review}»</p>}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-5">
          {/* ═══ Клиент ═══ */}
          {show('client') && <section className="card">
            <div className="eyebrow mb-3">Клиент</div>
            <div className="flex items-center gap-3">
              <Avatar src={o.client_avatar} name={o.client_name} size={52} />
              <div className="flex-1 min-w-0">
                <div className="font-black text-lg leading-snug">{o.client_name}</div>
                <div className="text-sm text-white/55">{o.client_phone ?? 'Телефон откроется после принятия заказа'}</div>
              </div>
            </div>
          </section>}

          {/* ═══ История визитов питомца ═══ */}
          {show('pet') && <section className="card">
            <div className="eyebrow mb-3">Медкарта · прошлые визиты</div>
            {o.visits.length === 0 ? <p className="text-sm text-white/50">Это первый визит питомца в ВетДом.</p> : (
              <div className="space-y-3">
                {(allVisits ? o.visits : o.visits.slice(0, 3)).map((v) => (
                  <div key={v.id} className="relative pl-5">
                    <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-amber-300/70" />
                    <div className="text-sm font-bold">{v.service_name} <span className="text-white/40 font-normal">· {dateShort(v.scheduled_at)}</span></div>
                    <div className="text-xs text-white/45">{v.vet_name}</div>
                    {v.vet_conclusion && <div className="text-sm text-white/70 mt-1">{v.vet_conclusion}</div>}
                  </div>
                ))}
                {o.visits.length > 3 && !allVisits && (
                  <button onClick={() => setAllVisits(true)} className="btn-ghost w-full py-2.5 text-sm">Все визиты · {o.visits.length}</button>
                )}
              </div>
            )}
          </section>}

          {/* ═══ Хронология ═══ */}
          {show('log') && <section className="card">
            <div className="eyebrow mb-3">Хронология заказа</div>
            <div className="space-y-2.5">
              {o.history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-white/40 w-12 flex-shrink-0 tabular-nums">{time(h.created_at)}</span>
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: STATUS[h.status]?.color ?? '#999' }} />
                  <span className="text-white/80">{h.comment || STATUS[h.status]?.label}</span>
                </div>
              ))}
            </div>
          </section>}
        </div>
      </div>

      {/* Завершение приёма */}
      <Modal open={finish} onClose={() => setFinish(false)} title="Завершить приём">
        <p className="text-white/60 text-sm mb-4">Заключение попадёт в медкарту {o.pet_name} — клиент увидит его в приложении.</p>
        <label className="label">Заключение и рекомендации</label>
        <textarea className="input min-h-[130px]" value={conclusion} onChange={(e) => setConclusion(e.target.value)}
          placeholder="Например: общее состояние удовлетворительное, проведена вакцинация. Рекомендовано…" />
        <div className="flex flex-wrap gap-2 mt-2">
          {['Вакцинация проведена, реакции нет.', 'Рекомендован повторный осмотр через 14 дней.', 'Назначена диета, связь в чате.'].map((t) => (
            <button key={t} onClick={() => setConclusion((c) => (c ? `${c} ${t}` : t))} className="chip bg-white/[0.06] text-white/70 border border-white/10 hover:bg-white/10">+ {t}</button>
          ))}
        </div>
        <label className="label mt-5">Итоговая стоимость визита, ₽</label>
        <input className="input" inputMode="numeric" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value.replace(/\D/g, ''))} />
        <div className="flex items-center justify-between mt-3 rounded-2xl bg-green-500/10 border border-green-400/25 px-4 py-3">
          <span className="text-sm text-white/70">Ваш доход ({o.percent}%)</span>
          <span className="text-xl font-black text-green-300">{rub(Math.round((Number(finalPrice) || 0) * o.percent / 100))}</span>
        </div>
        <button onClick={doFinish} disabled={busy} className="btn-green w-full mt-5 py-4 text-lg">Завершить и получить оплату</button>
      </Modal>

      {/* Успех */}
      <Modal open={done !== null} onClose={() => setDone(null)}>
        <div className="text-center pb-2">
          <div className="text-6xl mb-3">🎉</div>
          <div className="text-2xl font-black">Визит завершён!</div>
          <div className="text-white/60 mt-1">На ваш баланс зачислено</div>
          <div className="text-5xl font-black text-green-300 mt-3">+{rub(done)}</div>
          <div className="grid grid-cols-2 gap-2 mt-7">
            <Link to="/finance" className="btn-ghost">Мой доход</Link>
            <Link to="/" className="btn-green">На главную</Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
