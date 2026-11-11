import { getLang, LANGS, setLang } from '../lib/i18n';

// Переключатель языка: русский, English, Türkçe, العربية
export default function LangSwitch({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const cur = getLang();
  return (
    <div data-notr className={`grid grid-cols-4 gap-1.5 ${className}`} dir="ltr">
      {LANGS.map((l) => (
        <button key={l.k} type="button" onClick={() => l.k !== cur && setLang(l.k)} title={l.label}
          className={`rounded-xl font-bold transition-colors ${compact ? 'py-1.5 text-[11px]' : 'py-2.5 text-sm'} ${
            l.k === cur ? 'bg-green-500 text-white' : 'bg-white/[0.06] border border-white/10 text-white/70 hover:bg-white/10'}`}>
          <span className="mr-1">{l.flag}</span>{compact ? l.short : l.label}
        </button>
      ))}
    </div>
  );
}
