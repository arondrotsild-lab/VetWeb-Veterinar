import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useVet } from '../lib/vet';
import { acceptOrder, declineOrder, errText } from '../lib/api';
import { rub, when, speciesEmoji } from '../lib/format';

const SECONDS = 30;

// Всплывающее окно «Новый заказ!» с таймером, как в приложениях такси
export default function IncomingAlert() {
  const { alert, dismissAlert, refresh } = useVet();
  const navigate = useNavigate();
  const [left, setLeft] = useState(SECONDS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!alert) return;
    setLeft(SECONDS); setErr('');
    const iv = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(iv);
  }, [alert?.id]);

  useEffect(() => { if (alert && left <= 0) dismissAlert(); }, [left, alert, dismissAlert]);

  if (!alert) return null;
  const o = alert;
  const urgent = o.service_name === 'Скорая ветпомощь';

  const accept = async () => {
    setBusy(true);
    try {
      await acceptOrder(o.id);
      dismissAlert();
      await refresh();
      navigate(`/orders/${o.id}`);
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const skip = async () => {
    dismissAlert();
    await declineOrder(o.id).catch(() => {});
    refresh();
  };

  const c = 2 * Math.PI * 22;
  return (
    <div className="sheet-wrap fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissAlert} />
      <div className="incoming-sheet slide-up relative w-full md:max-w-md rounded-t-[2rem] md:rounded-[2rem] overflow-x-hidden overflow-y-auto border border-amber-300/30 shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #5A4331 0%, #3B2A1E 50%, #241911 100%)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-green-400/20 blur-3xl pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bell text-2xl">🔔</span>
              <span className="eyebrow !text-[#FACC15]">{urgent ? 'Срочный вызов' : 'Новый заказ'}</span>
            </div>
            <div className="relative w-14 h-14">
              <svg width="56" height="56" className="-rotate-90">
                <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
                <circle cx="28" cy="28" r="22" stroke="#FACC15" strokeWidth="5" fill="none" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={c * (1 - left / SECONDS)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-black">{Math.max(0, left)}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-white/60 text-sm">Вы получите</div>
            <div className="text-5xl font-black text-green-300 leading-none mt-1">{rub(o.payout_estimate)}</div>
            <div className="text-xs text-white/45 mt-1.5">Стоимость визита {rub((o.total_price || 0) + (o.bonus_used || 0))}</div>
          </div>

          <div className="mt-5 rounded-2xl bg-black/25 border border-white/10 p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{speciesEmoji(o.pet_species)}</span>
              <div className="min-w-0">
                <div className="font-black">{o.service_name}</div>
                <div className="text-sm text-white/65 leading-snug">{o.pet_name} · {o.pet_species}{o.pet_breed ? `, ${o.pet_breed}` : ''}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-white/75"><Icon name="pin" size={16} className="text-amber-300 mt-0.5 flex-shrink-0" />{o.address}</div>
            <div className="flex items-center gap-2 text-sm text-white/75"><Icon name="clock" size={16} className="text-amber-300 flex-shrink-0" />{when(o.scheduled_at)}</div>
            {o.notes && <div className="text-sm text-white/60 italic">«{o.notes}»</div>}
          </div>

          {err && <div className="mt-3 text-sm text-red-300">{err}</div>}

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={accept} disabled={busy} className="btn-green text-lg py-4">
              <Icon name="check" size={22} stroke={2.6} />Принять
            </button>
            <button onClick={skip} disabled={busy} className="btn-ghost px-5">Пропустить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
