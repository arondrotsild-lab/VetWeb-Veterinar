import { Link } from 'react-router-dom';
import Icon3D, { tiltHandlers } from './Icon3D';

// Объёмная плитка-раздел (как в клиентском приложении ВетДом):
// сочный градиент, глянцевый блик, «парящая» 3D-иконка, нажатие как у настоящей кнопки
export const TONES: Record<string, { bg: string; dark?: boolean }> = {
  green:  { bg: 'linear-gradient(145deg, #8BD14E 0%, #5E9E2C 45%, #2F5119 100%)' },
  yellow: { bg: 'linear-gradient(145deg, #FFE36E 0%, #FACC15 45%, #C98A06 100%)', dark: true },
  amber:  { bg: 'linear-gradient(145deg, #E7B985 0%, #B07F48 50%, #5C3F28 100%)' },
  sky:    { bg: 'linear-gradient(145deg, #7DD3FC 0%, #2B8FD6 50%, #1A4E7E 100%)' },
  red:    { bg: 'linear-gradient(145deg, #FF9A8A 0%, #E2533E 50%, #8E2416 100%)' },
  purple: { bg: 'linear-gradient(145deg, #C4B5FD 0%, #8B5CF6 50%, #4C2A85 100%)' },
  teal:   { bg: 'linear-gradient(145deg, #9FE3E0 0%, #2BA6A0 50%, #145A57 100%)' },
  coffee: { bg: 'linear-gradient(145deg, #8A6A50 0%, #5A4331 50%, #2A1D14 100%)' },
};

export default function Tile3D({ icon, label, sub, tone = 'coffee', badge, wide, onClick, to, small, active, pulse, dot }: {
  icon: string; label: string; sub?: string; tone?: string; badge?: number | string; wide?: boolean; onClick?: () => void; to?: string; small?: boolean; active?: boolean; pulse?: boolean; dot?: boolean;
}) {
  const t = TONES[tone] ?? TONES.coffee;
  const h = small ? 'h-[88px]' : 'h-[100px] [@media(max-height:700px)]:h-[88px]';
  const body = (
    <>
      <span className="tile3d-gloss" />
      <span className="tile-sweep" />
      <Icon3D emoji={icon} tone="cream" size={wide ? 56 : small ? 36 : 42} pulse={pulse} dot={dot}
        className={`!absolute z-[2] ${wide ? 'right-3 top-1/2' : 'right-2.5 top-2.5'}`} style={wide ? { marginTop: -28 } : undefined} />
      {badge !== undefined && badge !== 0 && badge !== '' && (
        <span className="absolute top-2 left-2 z-[2] min-w-[22px] h-[22px] px-1.5 rounded-full bg-white text-[#1E140D] text-[11px] font-black flex items-center justify-center shadow-md">{badge}</span>
      )}
      <span className={`relative z-[3] mt-auto block text-left ${wide ? 'pr-20' : 'pr-0'}`}>
        <span className={`block font-black leading-tight ${wide ? 'text-[17px]' : small ? 'text-[12px] break-words hyphens-auto' : 'text-[13px]'} ${t.dark ? 'text-[#1E140D]' : 'text-white'}`}
          style={{ textShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.35)' }}>{label}</span>
        {sub && <span className={`block text-[11px] font-semibold leading-tight mt-0.5 ${t.dark ? 'text-[#1E140D]/70' : 'text-white/80'}`}>{sub}</span>}
      </span>
    </>
  );
  const cls = `tile3d tilt3d relative overflow-hidden rounded-[22px] flex flex-col p-3 ${h} ${wide ? 'col-span-2' : ''} ${active ? 'outline outline-[3px] outline-white outline-offset-2' : ''}`;
  return to
    ? <Link to={to} className={cls} style={{ background: t.bg }} {...tiltHandlers}>{body}</Link>
    : <button type="button" data-active={active ? '1' : undefined} onClick={onClick} className={cls} style={{ background: t.bg }} {...tiltHandlers}>{body}</button>;
}
