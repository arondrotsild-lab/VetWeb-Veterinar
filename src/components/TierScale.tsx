import { Tier } from '../lib/api';

// Шкала уровней: Бронза → Серебро → Золото → Платина. Точки уровней стоят на равных расстояниях,
// а «бегунок» показывает, где врач сейчас по числу выполненных визитов.
export default function TierScale({ tiers, completed, compact = false }: { tiers: Tier[]; completed: number; compact?: boolean }) {
  const n = tiers.length - 1;
  let pos = 100;
  for (let i = 0; i < n; i++) {
    if (completed < tiers[i + 1].minOrders) {
      pos = ((i + (completed - tiers[i].minOrders) / (tiers[i + 1].minOrders - tiers[i].minOrders)) / n) * 100;
      break;
    }
  }
  const reachedIdx = tiers.reduce((acc, t, i) => (completed >= t.minOrders ? i : acc), 0);
  const gradient = `linear-gradient(90deg, ${tiers.map((t, i) => `${t.color} ${(i / n) * 100}%`).join(', ')})`;

  return (
    <div className={compact ? 'pt-1 pb-1' : 'pt-10 pb-2'}>
      <div className="relative mx-3">
        {/* дорожка */}
        <div className={`relative ${compact ? 'h-2.5' : 'h-4'} rounded-full bg-white/10 overflow-hidden`}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${pos}%`, background: gradient, backgroundSize: `${(100 / Math.max(pos, 1)) * 100}% 100%` }} />
        </div>
        {/* точки уровней */}
        {tiers.map((t, i) => {
          const reached = i <= reachedIdx;
          const left = `${(i / n) * 100}%`;
          return (
            <div key={t.key} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left }}>
              <div className={`${compact ? 'w-5 h-5 text-[10px]' : 'w-9 h-9 text-lg'} rounded-full flex items-center justify-center border-2 ${reached ? '' : 'grayscale opacity-60'}`}
                style={{ background: reached ? t.color : '#33241A', borderColor: reached ? '#fff' : 'rgba(255,255,255,0.2)', boxShadow: reached ? `0 0 16px ${t.color}88` : 'none' }}>
                {!compact && t.icon}
              </div>
            </div>
          );
        })}
        {/* бегунок «Вы здесь» */}
        {!compact && (
          <div className="absolute -top-9 -translate-x-1/2 transition-[left] duration-1000 ease-out" style={{ left: `${pos}%` }}>
            <div className="px-2 py-1 rounded-lg bg-white text-[#1E140D] text-[11px] font-black whitespace-nowrap shadow-lg">Вы · {completed}</div>
            <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1" />
          </div>
        )}
      </div>
      {/* подписи */}
      <div className={`relative ${compact ? 'mt-3 h-8' : 'mt-5 h-16'}`}>
        {tiers.map((t, i) => {
          const left = (i / n) * 100;
          const align = i === 0 ? 'left-0 text-left' : i === n ? 'right-0 text-right' : '-translate-x-1/2 text-center';
          return (
            <div key={t.key} className={`absolute ${align}`} style={i === 0 || i === n ? undefined : { left: `${left}%` }}>
              <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black`} style={{ color: t.color }}>{compact ? `${t.percent}%` : t.name}</div>
              {!compact && <div className="text-lg font-black leading-tight">{t.percent}%</div>}
              <div className="text-[10px] text-white/45 whitespace-nowrap">{t.minOrders ? `от ${t.minOrders} виз.` : 'старт'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
