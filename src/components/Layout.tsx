import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Avatar, OnlineSwitch } from './ui';
import IncomingAlert from './IncomingAlert';
import LangSwitch from './LangSwitch';
import LangMenu from './LangMenu';
import { useVet } from '../lib/vet';
import { useAuth } from '../lib/auth';
import { duration, rub } from '../lib/format';

const NAV = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/orders', label: 'Заказы', icon: 'orders' },
  { to: '/finance', label: 'Доход и расходы', icon: 'wallet' },
  { to: '/kpi', label: 'Мой уровень и KPI', icon: 'medal' },
  { to: '/league', label: 'Лига ветеринаров', icon: 'trophy' },
  { to: '/news', label: 'Новости', icon: 'news' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
  { to: '/settings', label: 'Настройки', icon: 'settings' },
];

const TITLES: [RegExp, string][] = [
  [/^\/orders\/\d+/, 'Заказ'], [/^\/orders/, 'Заказы'], [/^\/finance/, 'Доход и расходы'], [/^\/kpi/, 'Мой уровень'],
  [/^\/league/, 'Лига ветеринаров'], [/^\/news/, 'Новости'], [/^\/profile/, 'Профиль'], [/^\/settings/, 'Настройки'],
];

function Sidebar() {
  const { me, feed, online } = useVet();
  const { logout } = useAuth();
  const tier = me?.tier.current;
  const newCount = feed?.incoming.length ?? 0;
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-[272px] flex-col bg-[#2A1D14] border-r border-amber-300/15 z-40">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <Link to="/" className="relative flex items-center gap-3 px-6 pt-7 pb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-400/25 rounded-full blur-lg" />
          <img src="/logo.jpeg" alt="ВетДом" className="relative w-12 h-12 rounded-full object-cover border-2 border-white/30" />
        </div>
        <div className="leading-tight">
          <div className="font-black text-white tracking-wide">ВетДом</div>
          <div className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">Кабинет врача</div>
        </div>
      </Link>

      <div className="relative px-4 mb-4">
        <div className={`rounded-2xl p-3 border ${online ? 'border-green-400/30 bg-green-500/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
          <OnlineSwitch />
          {online && me?.profile.online_since && <div className="text-[11px] text-green-300/70 mt-2 pl-1">На линии {duration(me.profile.online_since)}</div>}
        </div>
      </div>

      <nav className="relative flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              isActive ? 'bg-green-500/15 text-green-300 border border-green-400/25' : 'text-white/70 hover:text-white hover:bg-white/[0.05] border border-transparent'}`}>
            <Icon name={n.icon} size={19} />
            <span className="flex-1">{n.label}</span>
            {n.to === '/orders' && newCount > 0 && online && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FACC15] text-[#1E140D] text-[11px] font-black flex items-center justify-center">{newCount}</span>}
          </NavLink>
        ))}
      </nav>

      <LangSwitch compact className="relative mx-3 mt-2" />
      {me && (
        <div className="relative m-3 p-3 rounded-2xl bg-black/20 border border-white/10">
          <Link to="/profile" className="flex items-center gap-3">
            <Avatar src={me.profile.photo_url} name={me.profile.name} size={40} ring={tier?.color} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{me.profile.name}</div>
              <div className="text-[11px] font-bold" style={{ color: tier?.color }}>{tier?.icon} {tier?.name} · {tier?.percent}%</div>
            </div>
          </Link>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Баланс</div>
              <div className="text-sm font-black">{rub(me.balance)}</div>
            </div>
            <button onClick={logout} className="text-xs text-white/40 hover:text-red-300 flex items-center gap-1.5"><Icon name="logout" size={15} />Выйти</button>
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusPill() {
  const { online, feed } = useVet();
  const n = online ? feed?.incoming.length ?? 0 : 0;
  return (
    <Link to="/orders" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black border ${online ? 'bg-green-500/15 border-green-400/40 text-green-300' : 'bg-white/[0.06] border-white/15 text-white/60'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 live-pulse' : 'bg-white/40'}`} />
      {online ? 'На линии' : 'Не на линии'}
      {n > 0 && <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FACC15] text-[#1E140D] text-[10px] flex items-center justify-center">{n}</span>}
    </Link>
  );
}

function MobileHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1];
  const isRoot = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`md:hidden fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-amber-300/25 transition-colors ${scrolled ? 'bg-[#4A3426]/95' : 'bg-[#4A3426]/85'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-16 px-4 flex items-center gap-2">
        {isRoot ? (
          <Link to="/" className="flex items-center gap-2.5 flex-1 min-w-0">
            <img src="/logo.jpeg" alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
            <div className="leading-tight">
              <div className="font-black text-sm">ВетДом</div>
              <div className="text-[9px] font-bold text-green-400 uppercase tracking-[0.2em]">Кабинет врача</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-white/10" aria-label="Назад">
              <Icon name="back" size={24} stroke={2.4} />
            </button>
            <span className="font-black text-[17px] truncate">{title}</span>
          </div>
        )}
        {pathname === '/profile' && (
          <Link to="/settings" className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 active:bg-white/10" aria-label="Настройки">
            <Icon name="settings" size={22} />
          </Link>
        )}
        <LangMenu compact />
        <StatusPill />
      </div>
    </header>
  );
}

const TabIcon = ({ d }: { d: string }) => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

// Нижнее меню как в клиентском приложении: 4 вкладки и большая круглая кнопка «На линии» в центре
function TabBar() {
  const { pathname } = useLocation();
  const { feed, online, setOnline, toggling } = useVet();
  const n = online ? feed?.incoming.length ?? 0 : 0;
  const tabs = [
    { to: '/', label: 'Главная', d: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
    { to: '/orders', label: 'Заказы', d: 'M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 6H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2M8 12h8M8 16h5', badge: n },
    { center: true, to: '', label: '', d: '' },
    { to: '/finance', label: 'Доход', d: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v11a2 2 0 002 2h15a1 1 0 001-1v-3M3 7h17a1 1 0 011 1v3m0 0h-4a2 2 0 000 4h4m0-4v4' },
    { to: '/profile', label: 'Профиль', d: 'M20 21a8 8 0 00-16 0M12 12a4 4 0 100-8 4 4 0 000 8z' },
  ];
  const active = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  return (
    <nav className="tabbar md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#1F150E]/95 backdrop-blur-xl border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 h-16">
        {tabs.map((t) => t.center ? (
          <button key="center" onClick={() => setOnline(!online)} disabled={toggling} className="flex flex-col items-center justify-start -mt-5" aria-label={online ? 'Уйти с линии' : 'Выйти на линию'}>
            <span className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-[#1F150E] transition-colors ${online ? 'bg-green-500 text-white shadow-green-900/50 live-pulse' : 'bg-[#4A3426] text-white/80 shadow-black/50'}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 3v9M18.4 6.6a9 9 0 11-12.8 0" /></svg>
            </span>
            <span className={`text-[10px] font-bold mt-0.5 ${online ? 'text-green-400' : 'text-white/60'}`}>{online ? 'На линии' : 'Не на линии'}</span>
          </button>
        ) : (
          <Link key={t.to} to={t.to} className={`relative flex flex-col items-center justify-center gap-0.5 ${active(t.to) ? 'text-green-400' : 'text-white/55 active:text-white'}`}>
            <TabIcon d={t.d} />
            <span className="text-[10px] font-semibold">{t.label}</span>
            {!!t.badge && <span className="absolute top-1.5 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FACC15] text-[#1E140D] text-[10px] font-black flex items-center justify-center">{t.badge}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileHeader />
      <main className="md:pl-[272px] pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div key={pathname} className="screen-in max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-9">{children}</div>
      </main>
      <TabBar />
      <div className="hidden md:block fixed top-5 right-6 z-40 rtl:right-auto rtl:left-6"><LangMenu /></div>
      <IncomingAlert />
    </div>
  );
}
