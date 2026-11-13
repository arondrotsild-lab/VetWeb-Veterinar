import { CSSProperties, PointerEvent } from 'react';

// Объёмная иконка-приложение (как в приложении профессора Якупова):
// толщина снизу, глянцевый блик, пробегающий блеск, покачивание картинки, свечение
export type I3DTone = 'cream' | 'green' | 'yellow' | 'amber' | 'sky' | 'red' | 'purple' | 'teal' | 'coffee' | 'pink';

let seq = 0;
export default function Icon3D({ emoji, tone = 'cream', size = 52, pulse, dot, still, className = '', style }: {
  emoji: string; tone?: I3DTone | string; size?: number; pulse?: boolean; dot?: boolean; still?: boolean; className?: string; style?: CSSProperties;
}) {
  // у каждой иконки свой момент «блеска» — они мигают вразнобой, как живые
  const n = (seq = (seq + 1) % 9);
  return (
    <span className={`i3d i3d-${tone} ${pulse ? 'pulse' : ''} ${still ? 'still' : ''} ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.31, ['--sweep' as string]: `${n * 0.7}s`, ['--bob' as string]: `${n * -0.4}s`, ...style }} aria-hidden>
      <span className="i3d-gloss" />
      <span className="i3d-emoji" style={{ fontSize: size * 0.54 }}>{emoji}</span>
      {dot && <span className="i3d-dot" />}
    </span>
  );
}

// Наклон плитки за пальцем / мышкой
export const tiltHandlers = {
  onPointerMove: (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${px * 10}deg`); el.style.setProperty('--rx', `${-py * 10}deg`);
  },
  onPointerLeave: (e: PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); },
  onPointerUp: (e: PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); },
};
