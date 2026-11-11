import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginReq, registerReq, errText } from '../lib/api';
import { useAuth } from '../lib/auth';
import Icon from '../components/Icon';
import LangSwitch from '../components/LangSwitch';
import LangMenu from '../components/LangMenu';

const DEMO = { phone: '+79990000101', password: 'vetdemo1234' };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', phone: '', password: '', email: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = (data: { token: string; user: { role: string } & Record<string, unknown> }) => {
    if (data.user.role !== 'vet' && data.user.role !== 'admin') {
      setErr('Этот номер зарегистрирован как клиент. Кабинет доступен только ветеринарам.');
      return;
    }
    login(data.token, data.user as never);
    navigate('/');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      finish(mode === 'login' ? await loginReq(form.phone, form.password) : await registerReq(form));
    } catch (e2) { setErr(errText(e2, 'Не удалось войти')); } finally { setBusy(false); }
  };

  const demo = async () => {
    setErr(''); setBusy(true);
    try { finish(await loginReq(DEMO.phone, DEMO.password)); }
    catch (e2) { setErr(errText(e2, 'Не удалось войти — попробуйте ещё раз через минуту')); } finally { setBusy(false); }
  };

  const perks = [
    { icon: '💰', t: 'До 70% от каждого визита', d: 'Чем выше уровень — тем больше доля' },
    { icon: '🔔', t: 'Заказы рядом с вами', d: 'Включили «На линии» — и заказы приходят сами' },
    { icon: '🏆', t: 'Лига ветеринаров', d: 'Бонусы лучшим врачам каждый месяц' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="fixed z-50 right-4 md:right-6" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}><LangMenu /></div>
      {/* Левая часть — бренд */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12"
        style={{ background: 'linear-gradient(150deg, #5A4331 0%, #3B2A1E 45%, #1F150E 100%)' }}>
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute -bottom-40 -left-20 w-[520px] h-[520px] rounded-full bg-green-500/15 blur-[120px]" />
        <div className="relative flex items-center gap-4">
          <img src="/logo.jpeg" alt="ВетДом" className="w-16 h-16 rounded-full object-cover border-2 border-white/30 shadow-xl" />
          <div>
            <div className="text-xl font-black">ВетДом</div>
            <div className="text-[11px] font-bold text-green-400 uppercase tracking-[0.25em]">Кабинет ветеринара</div>
          </div>
        </div>
        <div className="relative max-w-lg">
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight">
            Лечите питомцев.<br /><span className="text-green-400">Остальное мы возьмём на себя.</span>
          </h1>
          <p className="text-white/65 mt-5 text-lg leading-relaxed">
            Заказы, маршрут, медкарта пациента, доход и рост уровня — всё в одном кабинете.
          </p>
          <div className="mt-9 space-y-3">
            {perks.map((p) => (
              <div key={p.t} className="flex items-center gap-4 rounded-2xl bg-black/20 border border-white/10 px-4 py-3">
                <span className="text-2xl">{p.icon}</span>
                <div><div className="font-bold">{p.t}</div><div className="text-sm text-white/50">{p.d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-white/30 text-xs">© ВетДом · Ветеринар на дом</div>
      </div>

      {/* Правая часть — форма */}
      <div className="flex items-center justify-center px-5 py-10" style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))' }}>
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <img src="/logo.jpeg" alt="ВетДом" className="w-20 h-20 rounded-full object-cover border-2 border-white/30 shadow-xl mb-3" />
            <div className="text-2xl font-black">ВетДом</div>
            <div className="text-[11px] font-bold text-green-400 uppercase tracking-[0.25em]">Кабинет ветеринара</div>
          </div>

          <LangSwitch compact className="mb-6" />
          <h2 className="text-3xl font-black">{mode === 'login' ? 'Вход для врачей' : 'Стать врачом ВетДом'}</h2>
          <p className="text-white/50 mt-1.5 mb-7">{mode === 'login' ? 'Войдите по номеру телефона' : 'Заполните анкету — после проверки документов вы начнёте получать заказы'}</p>

          <button onClick={demo} disabled={busy} className="w-full mb-5 flex items-center gap-4 rounded-3xl p-4 text-left border border-amber-300/30 bg-gradient-to-br from-[#5A4331] to-[#2A1D14] hover:border-amber-300/60 transition-all group">
            <img src="/demo-vet-anna.jpg" alt="" className="w-14 h-14 rounded-2xl object-cover" />
            <div className="flex-1">
              <div className="eyebrow !text-[#FACC15]">Быстрый вход</div>
              <div className="font-black">Войти как Анна Соколова</div>
              <div className="text-xs text-white/50">Терапевт · уровень «Золото»</div>
            </div>
            <Icon name="chevron" className="text-white/40 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-3 my-5 text-white/30 text-xs"><div className="h-px flex-1 bg-white/10" />или<div className="h-px flex-1 bg-white/10" /></div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div><label className="label">Имя и фамилия</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Анна Соколова" /></div>
            )}
            <div><label className="label">Телефон</label>
              <input className="input" required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 999 000-00-00" /></div>
            {mode === 'register' && (
              <div><label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@mail.ru" /></div>
            )}
            <div><label className="label">Пароль</label>
              <input className="input" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></div>
            {err && <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3">{err}</div>}
            <button disabled={busy} className="btn-green w-full py-4 text-base">{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Отправить анкету'}</button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            {mode === 'login' ? 'Ещё не работаете с нами? ' : 'Уже есть аккаунт? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="text-green-400 font-bold hover:underline">
              {mode === 'login' ? 'Стать врачом ВетДом' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
