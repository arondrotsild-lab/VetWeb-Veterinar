import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeague } from '../lib/api';
import { plural, rub } from '../lib/format';

// Призовой фонд лиги: 30 000 ₽ врачу, который займёт 1 место по итогам месяца
export interface PrizeData { fund: number; season: string; daysLeft: number; rank: number; total: number; myScore: number; leaderScore: number; leaderName: string }

export function usePrize() {
  const [d, setD] = useState<PrizeData | null>(null);
  useEffect(() => {
    getLeague('score').then((l) => {
      const me = l.rows.find((r: { is_me: boolean }) => r.is_me);
      setD({
        fund: l.prize_fund ?? 30000, season: l.season, daysLeft: l.days_left, rank: me?.rank ?? 0, total: l.rows.length,
        myScore: me?.score ?? 0, leaderScore: l.leader_score ?? l.rows[0]?.score ?? 0, leaderName: l.rows[0]?.name ?? '',
      });
    }).catch(() => {});
  }, []);
  return d;
}

function gapText(d: PrizeData) {
  if (d.rank === 1) return 'Вы лидируете — удержите 1 место до конца месяца!';
  const gap = Math.max(1, d.leaderScore - d.myScore);
  return `До 1 места — ${gap} ${plural(gap, 'очко', 'очка', 'очков')}`;
}

// Большой блок — для лиги, главной на компьютере и страницы KPI
export default function PrizeFund({ compact = false }: { compact?: boolean }) {
  const d = usePrize();
  if (!d) return null;
  const pct = d.leaderScore ? Math.min(100, Math.round((d.myScore / d.leaderScore) * 100)) : 0;
  return (
    <Link to="/league" className="relative block overflow-hidden rounded-3xl border border-[#FACC15]/40 p-5 md:p-6 transition-transform active:scale-[0.99] hover:border-[#FACC15]/70"
      style={{ background: 'linear-gradient(135deg, #6B4E12 0%, #4A3420 45%, #2A1D14 100%)' }}>
      <div className="absolute -right-10 -top-12 w-56 h-56 rounded-full bg-[#FACC15]/25 blur-3xl pointer-events-none" />
      <div className="absolute right-3 -bottom-6 text-[120px] leading-none opacity-15 select-none pointer-events-none">🏆</div>
      <div className="relative">
        <div className="eyebrow !text-[#FDE68A]">Призовой фонд · {d.season}</div>
        <div className="flex items-end gap-3 mt-1 flex-wrap">
          <div className={`${compact ? 'text-4xl' : 'text-5xl md:text-6xl'} font-black text-[#FACC15] leading-none tracking-tight drop-shadow`}>{rub(d.fund)}</div>
          <div className="text-sm text-white/75 pb-1">за 1 место в лиге<br className="hidden md:block" /> + статус «Врач месяца»</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2">
            <div className="text-[10px] text-white/55 uppercase tracking-wider">Ваше место</div>
            <div className="text-[17px] md:text-xl font-black whitespace-nowrap">#{d.rank}<span className="text-white/40 text-sm"> из {d.total}</span></div>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2">
            <div className="text-[10px] text-white/55 uppercase tracking-wider">Ваши очки</div>
            <div className="text-[17px] md:text-xl font-black whitespace-nowrap">{d.myScore}<span className="text-white/40 text-sm"> / {d.leaderScore}</span></div>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2">
            <div className="text-[10px] text-white/55 uppercase tracking-wider">До итогов</div>
            <div className="text-[17px] md:text-xl font-black whitespace-nowrap">{d.daysLeft}<span className="text-white/40 text-sm"> {plural(d.daysLeft, 'день', 'дня', 'дней')}</span></div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2.5 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C99A63, #FACC15)' }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-[#FDE68A] font-bold">{gapText(d)}</span>
            {d.rank !== 1 && <span className="text-white/45 truncate ml-2">лидер: {d.leaderName}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Тонкая полоска — для главного экрана мобильного приложения
export function PrizeStrip() {
  const d = usePrize();
  if (!d) return null;
  return (
    <Link to="/league" className="flex items-center gap-3 rounded-2xl border border-[#FACC15]/45 px-3 py-2.5 active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(90deg, #6B4E12, #3B2A1E)' }}>
      <span className="text-2xl">🏆</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#FDE68A]">Приз за 1 место · месяц</div>
        <div className="font-black text-[#FACC15] leading-tight">{rub(d.fund)}</div>
      </div>
      <div className="text-right">
        <div className="font-black">#{d.rank}</div>
        <div className="text-[10px] text-white/60">{d.rank === 1 ? 'лидируете' : `−${Math.max(1, d.leaderScore - d.myScore)} оч.`}</div>
      </div>
    </Link>
  );
}
