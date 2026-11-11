import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, PageTitle, Segmented, Spinner } from '../components/ui';
import { getNews } from '../lib/api';
import { dateLong } from '../lib/format';

interface News { id: number; category: string; title: string; summary: string; body: string; source: string; published_at: string; pinned: boolean }

const CATS: Record<string, { l: string; icon: string; c: string; bg: string }> = {
  platform:  { l: 'ВетДом',     icon: '🏠', c: '#9BCD67', bg: 'linear-gradient(135deg, #3A651C, #1F150E)' },
  science:   { l: 'Наука',      icon: '🔬', c: '#9FE3E0', bg: 'linear-gradient(135deg, #24524F, #1F150E)' },
  world:     { l: 'В мире',     icon: '🌍', c: '#D9895F', bg: 'linear-gradient(135deg, #7A3E24, #1F150E)' },
  education: { l: 'Обучение',   icon: '🎓', c: '#FACC15', bg: 'linear-gradient(135deg, #6F5418, #1F150E)' },
};

export default function NewsPage() {
  const [list, setList] = useState<News[] | null>(null);
  const [cat, setCat] = useState('all');
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('id')) || null;
  useEffect(() => { getNews().then(setList).catch(() => setList([])); }, []);
  if (!list) return <Spinner />;

  const shown = list.filter((n) => cat === 'all' || n.category === cat);
  const [hero, ...rest] = shown;
  const open = list.find((n) => n.id === openId);

  const Cover = ({ n, big }: { n: News; big?: boolean }) => {
    const c = CATS[n.category] ?? CATS.platform;
    return (
      <div className={`relative overflow-hidden ${big ? 'h-44 md:h-60' : 'h-28'} flex items-end p-4`} style={{ background: c.bg }}>
        <div className="absolute inset-0 grid-bg opacity-70" />
        <span className={`absolute right-4 top-2 ${big ? 'text-[110px]' : 'text-6xl'} opacity-25 select-none`}>{c.icon}</span>
        <span className="relative chip bg-black/35 backdrop-blur border border-white/15" style={{ color: c.c }}>{c.icon} {c.l}</span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Новости" sub="Мир ветеринарии, наука, обучение и новости платформы" />
      <Segmented small className="md:max-w-xl" value={cat} onChange={setCat} options={[
        { k: 'all', label: 'Все' }, { k: 'platform', label: 'ВетДом' }, { k: 'science', label: 'Наука' }, { k: 'world', label: 'В мире' }, { k: 'education', label: 'Учёба' },
      ]} />

      {hero && (
        <button onClick={() => setParams({ id: String(hero.id) })} className="block w-full text-left rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/25 transition-colors fade-up">
          <Cover n={hero} big />
          <div className="p-5 md:p-6">
            <div className="text-xs text-white/45">{hero.pinned && '📌 Закреплено · '}{dateLong(hero.published_at)} · {hero.source}</div>
            <h2 className="text-2xl md:text-3xl font-black mt-1.5 leading-tight">{hero.title}</h2>
            <p className="text-white/65 mt-2 md:text-lg">{hero.summary}</p>
          </div>
        </button>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map((n, i) => (
          <button key={n.id} onClick={() => setParams({ id: String(n.id) })} className="text-left rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/25 transition-colors fade-up flex flex-col" style={{ ['--d' as string]: `${i * 50}ms` }}>
            <Cover n={n} />
            <div className="p-4 flex-1">
              <div className="text-[11px] text-white/45">{dateLong(n.published_at)}</div>
              <div className="font-black mt-1 leading-snug">{n.title}</div>
              <p className="text-sm text-white/55 mt-1.5">{n.summary}</p>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setParams({})} wide>
        {open && (
          <article>
            <div className="-mx-5 md:-mx-7 -mt-16 mb-5 rounded-t-3xl overflow-hidden"><Cover n={open} big /></div>
            <div className="text-xs text-white/45">{dateLong(open.published_at)} · {open.source}</div>
            <h2 className="text-2xl md:text-3xl font-black mt-1.5 leading-tight">{open.title}</h2>
            <p className="text-white/80 mt-3 text-lg font-semibold leading-relaxed">{open.summary}</p>
            <p className="text-white/70 mt-3 leading-relaxed">{open.body}</p>
          </article>
        )}
      </Modal>
    </div>
  );
}
