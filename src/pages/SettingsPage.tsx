import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { PageTitle, Spinner } from '../components/ui';
import Tile3D from '../components/Tile3D';
import LangSwitch from '../components/LangSwitch';
import { useVet } from '../lib/vet';
import { useAuth } from '../lib/auth';
import { changePassword, errText, getServices, updateProfile, uploadPhoto } from '../lib/api';
import { getPrefs, playChime, Prefs, setPrefs } from '../lib/prefs';
import { rub, useIsMobile } from '../lib/format';

const DAYS: [string, string][] = [['mon', 'Пн'], ['tue', 'Вт'], ['wed', 'Ср'], ['thu', 'Чт'], ['fri', 'Пт'], ['sat', 'Сб'], ['sun', 'Вс']];
type Day = { on: boolean; from: string; to: string };
const DEFAULT_SCHEDULE: Record<string, Day> = Object.fromEntries(DAYS.map(([k]) => [k, { on: !['sat', 'sun'].includes(k), from: '09:00', to: '20:00' }]));

const FAQ: [string, string][] = [
  ['Как повысить уровень и процент?', 'Уровень растёт с числом выполненных визитов и средней оценкой: Серебро — с 300 визитов, Золото — с 800, Платина — с 1500. Новый процент начинает действовать со следующего заказа.'],
  ['Когда приходят деньги?', 'Доход за визит зачисляется на баланс сразу после кнопки «Завершить приём». Вывести на карту можно в разделе «Доход» в любой момент или включить автовывод по понедельникам.'],
  ['Как попасть в призовую тройку лиги?', 'Очки складываются из числа визитов за 30 дней, средней оценки, доли клиентов, которые возвращаются, и скорости принятия заказа. 1 место по итогам месяца — 30 000 ₽.'],
  ['Что делать, если не успеваю на заказ?', 'До выезда к клиенту откройте заказ и нажмите «Не смогу приехать». Заказ вернётся в общую ленту, и его возьмёт другой врач.'],
  ['Почему не приходят заказы?', 'Проверьте, что вы «На линии» и что в разделе «Работа» отмечены нужные услуги. Если не выбрано ни одной услуги — приходят все заказы.'],
];

const SEC3D: Record<string, [string, string]> = {
  profile: ['👤', 'green'], work: ['🚗', 'sky'], notify: ['🔔', 'yellow'], look: ['🎨', 'purple'],
  payout: ['💳', 'teal'], security: ['🔒', 'red'], help: ['❓', 'coffee'],
};

const SECTIONS = [
  { id: 'profile', label: 'Профиль', icon: 'user' },
  { id: 'work', label: 'Работа', icon: 'car' },
  { id: 'notify', label: 'Уведомления', icon: 'bell' },
  { id: 'look', label: 'Внешний вид', icon: 'sparkle' },
  { id: 'payout', label: 'Выплаты', icon: 'card' },
  { id: 'security', label: 'Безопасность', icon: 'lock' },
  { id: 'help', label: 'Вопросы', icon: 'help' },
];

// На телефоне виден только выбранный раздел — переключение кнопками сверху, без долгого листания
const SectionView = createContext<{ mobile: boolean; current: string }>({ mobile: false, current: '' });

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  const view = useContext(SectionView);
  if (view.mobile && view.current !== id) return null;
  return (
    <section id={id} className="card scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl bg-green-500/15 text-green-300 flex items-center justify-center flex-shrink-0"><Icon name={icon} size={20} /></span>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center gap-4 py-3 text-left">
      <span className="flex-1 min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-xs text-white/50 mt-0.5 leading-snug">{hint}</span>}
      </span>
      <span className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${on ? 'bg-green-500' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

// Многострочное поле, которое растёт вместе с текстом — ничего не прячется
function AutoText({ value, onChange, placeholder, min = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; min?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea ref={ref} rows={min} className="input resize-none overflow-hidden leading-relaxed" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />
  );
}

function SaveBar({ onSave, busy, saved }: { onSave: () => void; busy: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-5">
      <button onClick={onSave} disabled={busy} className="btn-green px-6">{busy ? 'Сохраняю…' : 'Сохранить'}</button>
      {saved && <span className="text-sm text-green-300 flex items-center gap-1.5 fade-up"><Icon name="check" size={16} stroke={2.6} />Сохранено</span>}
    </div>
  );
}

// Сжимаем фото на телефоне до 800 px, чтобы загрузка была быстрой
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.88));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Не удалось открыть фото'));
    img.src = URL.createObjectURL(file);
  });
}

export default function SettingsPage() {
  const { me, refresh } = useVet();
  const { logout } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [services, setServices] = useState<{ id: number; name: string; icon: string; price_from: number }[]>([]);
  const [svcIds, setSvcIds] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<Record<string, Day>>(DEFAULT_SCHEDULE);
  const [autoPayout, setAutoPayout] = useState(false);
  const [prefs, setP] = useState<Prefs>(getPrefs());
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');
  const [pw, setPw] = useState({ old: '', next: '', again: '' });
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [sec, setSec] = useState('profile');
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');

  useEffect(() => { getServices().then(setServices).catch(() => {}); }, []);
  useEffect(() => {
    if (!me) return;
    const p = me.profile;
    setForm({
      name: p.name || '', email: p.email || '', specialization: p.specialization || '', experience_years: String(p.experience_years ?? ''),
      bio: p.bio || '', education: p.education || '', city: p.city || '', district: p.district || '', transport: p.transport || '',
      radius_km: String(p.radius_km ?? 10), daily_goal: String(p.daily_goal ?? 5),
      payout_bank: p.payout_bank || '', payout_card: p.payout_card ? `•••• ${p.payout_card}` : '', inn: p.inn || '',
    });
    setSvcIds(p.service_ids ?? []);
    setSchedule({ ...DEFAULT_SCHEDULE, ...(p.schedule || {}) });
    setAutoPayout(!!p.auto_payout);
  }, [me?.profile.id]);   // заполняем форму один раз

  if (!me) return <Spinner />;
  const p = me.profile;
  const f = (k: string) => form[k] ?? '';
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = async (key: string, data: Record<string, unknown>) => {
    setBusy(key); setErr(''); setSaved('');
    try { await updateProfile(data); await refresh(); setSaved(key); setTimeout(() => setSaved((s) => (s === key ? '' : s)), 2500); }
    catch (e) { setErr(errText(e)); } finally { setBusy(''); }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true); setErr('');
    try { await uploadPhoto(await resizeImage(file)); await refresh(); }
    catch (e) { setErr(errText(e, 'Не удалось загрузить фото')); } finally { setPhotoBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const pref = (patch: Partial<Prefs>) => setP(setPrefs(patch));
  const askNotify = async () => {
    if (!('Notification' in window)) return;
    const r = await Notification.requestPermission();
    setPerm(r);
    pref({ notify: r === 'granted' });
  };

  const savePassword = async () => {
    setErr('');
    if (pw.next !== pw.again) { setErr('Новые пароли не совпадают'); return; }
    setBusy('security');
    try { await changePassword(pw.old, pw.next); setPw({ old: '', next: '', again: '' }); setSaved('security'); }
    catch (e) { setErr(errText(e)); } finally { setBusy(''); }
  };

  const field = (k: string, label: string, ph = '', type = 'text', inputMode?: 'numeric' | 'email' | 'text') => (
    <div><label className="label">{label}</label><input className="input" type={type} inputMode={inputMode} value={f(k)} placeholder={ph} onChange={set(k)} /></div>
  );

  return (
    <div className="space-y-5">
      <PageTitle title="Настройки" sub="Профиль, работа, уведомления, внешний вид и выплаты" />

      {/* Быстрые переходы по разделам */}
      {isMobile && (
        <div data-tabs className="grid grid-cols-3 gap-2.5">
          {SECTIONS.map((x) => (
            <Tile3D key={x.id} small icon={SEC3D[x.id][0]} label={x.label} tone={SEC3D[x.id][1]} active={sec === x.id}
              onClick={() => { setSec(x.id); setErr(''); window.scrollTo({ top: 0 }); }} />
          ))}
        </div>
      )}
      <nav data-tabs className="hidden md:grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} data-active={isMobile && sec === s.id ? '1' : undefined} onClick={(e) => {
              e.preventDefault();
              if (isMobile) { setSec(s.id); setErr(''); window.scrollTo({ top: 0 }); }
              else document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex items-center justify-center gap-1.5 px-1 py-2.5 md:px-3.5 md:py-2 rounded-xl md:rounded-full text-[12.5px] md:text-[13px] font-bold whitespace-nowrap border transition-colors ${
              isMobile && sec === s.id ? 'bg-green-500 text-white border-green-400' : 'bg-white/[0.06] text-white/75 border-white/10 hover:bg-white/10'}`}>
            <Icon name={s.icon} size={15} className="hidden md:block" />{s.label}
          </a>
        ))}
      </nav>

      {err && <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-2xl px-4 py-3">{err}</div>}

      <SectionView.Provider value={{ mobile: isMobile, current: sec }}>
      {/* ═══ Профиль ═══ */}
      <Section id="profile" title="Профиль" icon="user">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative flex-shrink-0">
            <img src={p.photo_url || '/logo.jpeg'} alt="" className="w-24 h-24 rounded-3xl object-cover border-2 border-white/20" />
            <button onClick={() => fileRef.current?.click()} disabled={photoBusy}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-[#2A1D14] shadow-lg" aria-label="Сменить фото">
              {photoBusy ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Icon name="camera" size={17} />}
            </button>
          </div>
          <div className="min-w-0">
            <div className="font-black text-lg leading-snug">{p.name}</div>
            <div className="text-sm text-white/55">Фото видят клиенты в карточке врача</div>
            <button onClick={() => fileRef.current?.click()} disabled={photoBusy} className="text-sm font-bold text-green-300 mt-1">Сменить фото</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {field('name', 'Имя и фамилия')}
          {field('email', 'Email', 'doctor@mail.ru', 'email', 'email')}
          {field('specialization', 'Специализация', 'Терапевт, вакцинация')}
          {field('experience_years', 'Стаж, лет', '', 'text', 'numeric')}
          <div className="md:col-span-2"><label className="label">Образование и курсы</label><AutoText value={f('education')} onChange={(v) => setForm({ ...form, education: v })} /></div>
        </div>
        <div className="mt-4"><label className="label">О себе — это видят клиенты</label>
          <AutoText min={4} value={f('bio')} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Расскажите о своём опыте и подходе к пациентам" /></div>
        <div className="text-xs text-white/40 mt-2">Телефон для входа: {p.phone}. Чтобы сменить номер, напишите в поддержку.</div>
        <SaveBar busy={busy === 'profile'} saved={saved === 'profile'} onSave={() => save('profile', {
          name: f('name'), email: f('email'), specialization: f('specialization'), experience_years: f('experience_years'), education: f('education'), bio: f('bio'),
        })} />
      </Section>

      {/* ═══ Работа ═══ */}
      <Section id="work" title="Работа" icon="car">
        <div className="grid md:grid-cols-2 gap-4">
          {field('city', 'Город')}
          <div><label className="label">Районы выезда</label><AutoText min={1} value={f('district')} onChange={(v) => setForm({ ...form, district: v })} placeholder="ЦАО, ЗАО, Хамовники" /></div>
          {field('transport', 'Транспорт', 'Собственный автомобиль')}
          <div>
            <label className="label">Радиус выезда: {f('radius_km') || 10} км</label>
            <input type="range" min={2} max={40} step={1} value={Number(f('radius_km')) || 10} onChange={set('radius_km')} className="w-full accent-green-500 h-10" />
          </div>
          <div>
            <label className="label">Цель — визитов в день</label>
            <div className="grid grid-cols-6 gap-1.5 max-w-xs">
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, daily_goal: String(n) })}
                  className={`h-11 min-w-0 rounded-xl font-black ${f('daily_goal') === String(n) ? 'bg-green-500 text-white' : 'bg-white/[0.06] border border-white/10 text-white/70'}`}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="label">Какие услуги я выполняю</label>
          <p className="text-xs text-white/50 mb-3">Заказы на другие услуги к вам приходить не будут. Если ничего не выбрано — приходят все.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {services.map((s) => {
              const on = svcIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => setSvcIds(on ? svcIds.filter((x) => x !== s.id) : [...svcIds, s.id])}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border text-left transition-colors ${on ? 'border-green-400/60 bg-green-500/12' : 'border-white/10 bg-white/[0.03]'}`}>
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-green-500 text-white' : 'bg-white/10'}`}>{on && <Icon name="check" size={14} stroke={3} />}</span>
                  <span className="flex-1 min-w-0 text-sm font-semibold leading-snug">{s.name}</span>
                  <span className="text-xs text-white/45 whitespace-nowrap">от {rub(s.price_from)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="label">График работы</label>
          <div className="space-y-2">
            {DAYS.map(([k, l]) => {
              const d = schedule[k];
              return (
                <div key={k} className={`flex items-center gap-2 rounded-2xl px-2.5 py-2 border ${d.on ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 bg-transparent'}`}>
                  <button type="button" onClick={() => setSchedule({ ...schedule, [k]: { ...d, on: !d.on } })}
                    className={`w-12 h-9 rounded-xl font-black text-sm flex-shrink-0 ${d.on ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'}`}>{l}</button>
                  {d.on ? (
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <input type="time" value={d.from} onChange={(e) => setSchedule({ ...schedule, [k]: { ...d, from: e.target.value } })} className="input time-input !py-2 !px-2 flex-1 min-w-0 w-0 text-center" />
                      <span className="text-white/40 flex-shrink-0">—</span>
                      <input type="time" value={d.to} onChange={(e) => setSchedule({ ...schedule, [k]: { ...d, to: e.target.value } })} className="input time-input !py-2 !px-2 flex-1 min-w-0 w-0 text-center" />
                    </div>
                  ) : <span className="text-sm text-white/40">Выходной</span>}
                </div>
              );
            })}
          </div>
        </div>
        <SaveBar busy={busy === 'work'} saved={saved === 'work'} onSave={() => save('work', {
          city: f('city'), district: f('district'), transport: f('transport'), radius_km: Number(f('radius_km')) || 10,
          daily_goal: Number(f('daily_goal')) || 5, service_ids: svcIds, schedule,
        })} />
      </Section>

      {/* ═══ Уведомления ═══ */}
      <Section id="notify" title="Уведомления" icon="bell">
        <div className="divide-y divide-white/[0.07]">
          <Toggle on={prefs.sound} onChange={(v) => pref({ sound: v })} label="Звук нового заказа" hint="Сигнал, когда рядом появляется новый заказ" />
          {prefs.sound && (
            <div className="py-3">
              <div className="text-sm text-white/60 mb-1">Громкость: {Math.round(prefs.volume * 100)}%</div>
              <div className="flex items-center gap-3">
                <input type="range" min={0.1} max={1} step={0.1} value={prefs.volume} onChange={(e) => pref({ volume: Number(e.target.value) })} className="flex-1 min-w-0 accent-green-500 h-10" />
                <button type="button" onClick={() => playChime(true)} className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-400/40 text-green-300 text-sm font-bold px-3.5 py-2 active:scale-95">
                  <Icon name="play" size={14} />Звук
                </button>
              </div>
            </div>
          )}
          <Toggle on={prefs.vibrate} onChange={(v) => pref({ vibrate: v })} label="Вибрация" hint="Телефон вибрирует при новом заказе (Android)" />
          {perm === 'granted'
            ? <Toggle on={prefs.notify} onChange={(v) => pref({ notify: v })} label="Уведомления на экран" hint="Показывать новый заказ, даже когда кабинет свёрнут" />
            : (
              <div className="py-3 flex items-center gap-4">
                <div className="flex-1"><div className="font-semibold">Уведомления на экран</div><div className="text-xs text-white/50 mt-0.5">{perm === 'denied' ? 'Запрещены в настройках браузера — разрешите их для этого сайта' : 'Показывать новый заказ, даже когда кабинет свёрнут'}</div></div>
                {perm !== 'denied' && <button type="button" onClick={askNotify} className="btn-green !py-2 !px-4 text-sm flex-shrink-0">Включить</button>}
              </div>
            )}
        </div>
      </Section>

      {/* ═══ Внешний вид ═══ */}
      <Section id="look" title="Внешний вид" icon="sparkle">
        <label className="label">Язык приложения</label>
        <LangSwitch className="!grid-cols-2 md:!grid-cols-4 mb-5" />
        <label className="label">Размер шрифта</label>
        <div className="grid grid-cols-3 gap-2">
          {([['small', 'Мелкий', 'text-sm'], ['normal', 'Обычный', 'text-base'], ['large', 'Крупный', 'text-lg']] as const).map(([k, l, cls]) => (
            <button key={k} type="button" onClick={() => pref({ font: k })}
              className={`rounded-2xl py-3 border font-bold ${cls} ${prefs.font === k ? 'border-green-400 bg-green-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/70'}`}>
              Аа <span className="block text-xs font-semibold mt-0.5 opacity-80">{l}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 divide-y divide-white/[0.07]">
          <Toggle on={prefs.motion} onChange={(v) => pref({ motion: v })} label="Анимации" hint="Плавные появления и пульсация кнопок. Выключите, если телефон медленный" />
        </div>
      </Section>

      {/* ═══ Выплаты ═══ */}
      <Section id="payout" title="Выплаты" icon="card">
        <div className="grid md:grid-cols-2 gap-4">
          {field('payout_bank', 'Банк', 'Т-Банк, Сбербанк…')}
          {field('payout_card', 'Номер карты', '0000 0000 0000 0000', 'text', 'numeric')}
          {field('inn', 'ИНН самозанятого', '12 цифр', 'text', 'numeric')}
        </div>
        <p className="text-xs text-white/45 mt-2">Мы храним только последние 4 цифры карты.</p>
        <div className="mt-2 divide-y divide-white/[0.07]">
          <Toggle on={autoPayout} onChange={setAutoPayout} label="Автовывод каждый понедельник" hint="Весь баланс автоматически уходит на карту раз в неделю" />
        </div>
        <SaveBar busy={busy === 'payout'} saved={saved === 'payout'} onSave={() => save('payout', {
          payout_bank: f('payout_bank'), inn: f('inn'), auto_payout: autoPayout,
          ...(f('payout_card').includes('•') ? {} : { payout_card: f('payout_card') }),
        })} />
      </Section>

      {/* ═══ Безопасность ═══ */}
      <Section id="security" title="Безопасность" icon="lock">
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="label">Текущий пароль</label><input className="input" type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></div>
          <div><label className="label">Новый пароль</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div><label className="label">Ещё раз</label><input className="input" type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button onClick={savePassword} disabled={busy === 'security' || !pw.old || !pw.next} className="btn-green px-6">Сменить пароль</button>
          {saved === 'security' && <span className="text-sm text-green-300 flex items-center gap-1.5"><Icon name="check" size={16} stroke={2.6} />Пароль изменён</span>}
          <button onClick={logout} className="btn-ghost text-red-300/90 md:ml-auto"><Icon name="logout" size={17} />Выйти из кабинета</button>
        </div>
      </Section>

      {/* ═══ Поддержка ═══ */}
      <Section id="help" title="Частые вопросы" icon="help">
        <div className="space-y-2">
          {FAQ.map(([q, ans]) => (
            <details key={q} className="group rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold">
                {q}<Icon name="chevron" size={16} className="text-white/40 transition-transform group-open:rotate-90 flex-shrink-0" />
              </summary>
              <p className="text-sm text-white/65 mt-2 leading-relaxed">{ans}</p>
            </details>
          ))}
        </div>
        <div className="text-xs text-white/35 mt-5">ВетДом · Кабинет врача · версия 1.0</div>
      </Section>
      </SectionView.Provider>
    </div>
  );
}
