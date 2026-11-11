import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Tile3D from '../components/Tile3D';
import { Avatar, Modal, Segmented, Spinner, Stars } from '../components/ui';
import { useVet } from '../lib/vet';
import { useAuth } from '../lib/auth';
import { errText, getReviews, updateProfile } from '../lib/api';
import { dateShort, rub, speciesEmoji, useIsMobile } from '../lib/format';

interface Review { id: number; rating: number; text?: string; completed_at: string; client_name: string; pet_name: string; pet_species: string; service_name: string }

export default function ProfilePage() {
  const { me, refresh } = useVet();
  const { logout } = useAuth();
  const [rev, setRev] = useState<{ reviews: Review[]; distribution: { stars: number; n: number }[] } | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [onlyText, setOnlyText] = useState(true);
  const [revLimit, setRevLimit] = useState(8);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'about' | 'reviews'>('about');
  const show = (t: typeof tab) => !isMobile || tab === t;

  useEffect(() => { getReviews().then(setRev).catch(() => {}); }, []);
  if (!me) return <Spinner />;
  const p = me.profile;
  const m = me.metrics;
  const tier = me.tier.current;

  const openEdit = () => {
    setForm({
      name: p.name || '', email: p.email || '', specialization: p.specialization || '', experience_years: String(p.experience_years ?? ''),
      bio: p.bio || '', city: p.city || '', district: p.district || '', education: p.education || '', transport: p.transport || '',
      daily_goal: String(p.daily_goal ?? 5),
    });
    setErr(''); setEdit(true);
  };
  const save = async () => {
    try { await updateProfile(form); await refresh(); setEdit(false); } catch (e) { setErr(errText(e)); }
  };

  const total = rev?.distribution.reduce((a, d) => a + d.n, 0) || 1;
  const reviews = (rev?.reviews ?? []).filter((r) => !onlyText || r.text);
  const since = p.joined_at ? new Date(p.joined_at).getFullYear() : new Date().getFullYear();

  const field = (k: string, l: string, ph = '', type = 'text') => (
    <div><label className="label">{l}</label><input className="input" type={type} value={form[k] ?? ''} placeholder={ph} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <div className="space-y-5">
      <Segmented className="md:hidden" value={tab} onChange={setTab} options={[{ k: 'about', label: 'Обо мне' }, { k: 'reviews', label: 'Отзывы' }]} />

      {show('about') && <>
      {/* ═══ Шапка профиля ═══ */}
      <section className="card-warm !p-6 md:!p-8">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${tier.color}33, transparent 70%)` }} />
        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative">
            <img src={p.photo_url || '/logo.jpeg'} alt={p.name} className="w-32 h-32 rounded-3xl object-cover" style={{ border: `3px solid ${tier.color}`, boxShadow: `0 0 40px ${tier.color}55` }} />
            <span className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-4 border-[#3B2A1E] ${me.profile.is_available ? 'bg-green-400' : 'bg-white/30'}`} title={me.profile.is_available ? 'На линии' : 'Не на линии'} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <h1 className="text-3xl font-black">{p.name}</h1>
              {p.is_verified && <span className="chip bg-green-500/15 text-green-300 border border-green-400/30"><Icon name="check" size={12} stroke={3} />Документы проверены</span>}
            </div>
            <div className="text-white/70 mt-1">{p.specialization || 'Ветеринарный врач'} · стаж {p.experience_years ?? 0} {(p.experience_years ?? 0) % 10 === 1 && (p.experience_years ?? 0) !== 11 ? 'год' : 'лет'}</div>
            <div className="flex items-center gap-2 mt-2 justify-center md:justify-start flex-wrap">
              <span className="chip" style={{ color: tier.color, background: `${tier.color}1f`, border: `1px solid ${tier.color}66` }}>{tier.icon} {tier.name} · {tier.percent}%</span>
              <span className="chip bg-white/[0.06] text-white/80"><Stars value={m.rating} size={11} /> {m.rating.toFixed(2)}</span>
              <span className="chip bg-white/[0.06] text-white/60">С ВетДом с {since} года</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/settings" className="btn-ghost"><Icon name="settings" size={17} />Настройки</Link>
          </div>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
          {[
            { v: m.completed_total, l: 'визитов всего' },
            { v: m.clients, l: 'клиентов' },
            { v: rub(m.earned_total), l: 'заработано всего' },
            { v: `${m.return_rate}%`, l: 'клиентов вернулись' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-black/20 border border-white/10 p-3 text-center">
              <div className="money text-[clamp(1rem,4.9vw,1.5rem)] font-black">{s.v}</div>
              <div className="text-[11px] text-white/50 uppercase tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Быстрые ссылки (на телефоне, где нет бокового меню) ═══ */}
      <section className="md:hidden grid grid-cols-3 gap-2.5">
        <Tile3D wide to="/kpi" icon={tier.icon} label="Мой уровень и KPI" sub={`${tier.name} · ${tier.percent}% от заказа`} tone="purple" />
        <Tile3D to="/finance" icon="💰" label="Доход" sub="и выплаты" tone="teal" />
        <Tile3D to="/league" icon="🏆" label="Лига" sub="приз 30 000 ₽" tone="amber" />
        <Tile3D to="/orders?tab=history" icon="🗂️" label="История" sub={`${m.completed_total} визитов`} tone="coffee" />
        <Tile3D to="/news" icon="📰" label="Новости" sub="мир ветеринарии" tone="sky" />
        <Tile3D wide to="/settings" icon="⚙️" label="Настройки" sub="фото, график, услуги, выплаты" tone="green" />
      </section>

      </>}

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
        {/* ═══ Анкета ═══ */}
        {show('about') && (
        <section className="card space-y-4">
          <div className="font-black text-lg">Анкета врача</div>
          {p.bio && <p className="text-white/75 leading-relaxed">{p.bio}</p>}
          <div className="space-y-3 text-sm">
            {[
              { i: 'phone', l: 'Телефон', v: p.phone },
              { i: 'doc', l: 'Email', v: p.email },
              { i: 'pin', l: 'Город и районы выезда', v: [p.city, p.district].filter(Boolean).join(' · ') },
              { i: 'medal', l: 'Образование', v: p.education },
              { i: 'car', l: 'Транспорт', v: p.transport },
              { i: 'target', l: 'Цель на день', v: `${p.daily_goal ?? 5} визитов` },
            ].map((x) => (
              <div key={x.l} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-amber-300 flex-shrink-0"><Icon name={x.i} size={17} /></span>
                <div><div className="text-[11px] text-white/45 uppercase tracking-wider">{x.l}</div><div className="text-white/90">{x.v || <span className="text-white/35">не указано</span>}</div></div>
              </div>
            ))}
          </div>
          <button onClick={logout} className="w-full mt-2 btn-ghost text-red-300/80 hover:text-red-300"><Icon name="logout" size={17} />Выйти из кабинета</button>
        </section>

)}
        {/* ═══ Отзывы ═══ */}
        {show('reviews') && (
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-black text-lg">Отзывы клиентов</div>
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input type="checkbox" checked={onlyText} onChange={(e) => setOnlyText(e.target.checked)} className="accent-green-500" />с текстом
            </label>
          </div>
          <div className="flex items-center gap-6 mb-5">
            <div className="text-center">
              <div className="text-5xl font-black">{m.rating.toFixed(2)}</div>
              <Stars value={m.rating} />
              <div className="text-[11px] text-white/45 mt-1">{m.reviews} оценок</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const n = rev?.distribution.find((d) => d.stars === s)?.n ?? 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-white/60">{s}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#FACC15] rounded-full" style={{ width: `${(n / total) * 100}%` }} /></div>
                    <span className="w-7 text-right text-white/45 tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-3 md:max-h-[520px] md:overflow-y-auto md:pr-1">
            {reviews.slice(0, revLimit).map((r) => (
              <div key={r.id} className="rounded-2xl bg-black/15 border border-white/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={r.client_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold leading-snug">{r.client_name}</div>
                    <div className="text-[11px] text-white/45">{speciesEmoji(r.pet_species)} {r.pet_name} · {r.service_name} · {dateShort(r.completed_at)}</div>
                  </div>
                  <Stars value={r.rating} size={12} />
                </div>
                {r.text && <p className="text-sm text-white/80 mt-2.5 leading-relaxed">«{r.text}»</p>}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-white/50">Пока нет отзывов.</p>}
          </div>
          {reviews.length > revLimit && (
            <button onClick={() => setRevLimit((l) => l + 10)} className="btn-ghost w-full mt-3 py-3">Показать ещё отзывы</button>
          )}
        </section>
        )}
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Редактировать профиль" wide>
        <div className="grid md:grid-cols-2 gap-4">
          {field('name', 'Имя и фамилия')}
          {field('email', 'Email', '', 'email')}
          {field('specialization', 'Специализация', 'Терапевт, вакцинация')}
          {field('experience_years', 'Стаж, лет', '', 'number')}
          {field('city', 'Город')}
          {field('district', 'Районы выезда', 'ЦАО, ЗАО')}
          {field('education', 'Образование')}
          {field('transport', 'Транспорт', 'Собственный автомобиль')}
          {field('daily_goal', 'Цель — визитов в день', '', 'number')}
        </div>
        <div className="mt-4"><label className="label">О себе — это видят клиенты</label>
          <textarea className="input min-h-[110px]" value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        {err && <div className="text-sm text-red-300 mt-3">{err}</div>}
        <button onClick={save} className="btn-green w-full mt-5 py-4">Сохранить</button>
      </Modal>
    </div>
  );
}
