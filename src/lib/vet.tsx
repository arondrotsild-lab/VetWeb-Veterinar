import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Feed, Me, Order, getFeed, getMe, setOnline as apiSetOnline } from './api';
import { notifyNewOrder, playChime } from './prefs';

// Общее состояние кабинета: профиль, онлайн-статус, лента заказов.
// Лента опрашивается каждые 5 секунд; о новом заказе сообщаем окном и звуком.

interface Ctx {
  me: Me | null;
  feed: Feed | null;
  online: boolean;
  toggling: boolean;
  setOnline: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  alert: Order | null;
  dismissAlert: () => void;
}

const VetCtx = createContext<Ctx | null>(null);

export function VetProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [toggling, setToggling] = useState(false);
  const [alert, setAlert] = useState<Order | null>(null);
  const seen = useRef<Set<number> | null>(null);

  const loadFeed = useCallback(async () => {
    const f = await getFeed();
    setFeed(f);
    const ids = new Set(f.incoming.map((o) => o.id));
    if (seen.current === null) {
      seen.current = ids;                         // первая загрузка — без сигнала
    } else {
      const fresh = f.incoming.find((o) => !seen.current!.has(o.id));
      f.incoming.forEach((o) => seen.current!.add(o.id));
      if (fresh) {
        setAlert(fresh); playChime();
        notifyNewOrder('Новый заказ — ВетДом', `${fresh.service_name} · ${fresh.pet_name} · ${fresh.address}`);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const [m] = await Promise.all([getMe(), loadFeed()]);
    setMe(m);
  }, [loadFeed]);

  useEffect(() => {
    refresh().catch(() => {});
    const iv = setInterval(() => { loadFeed().catch(() => {}); }, 5000);
    const iv2 = setInterval(() => { getMe().then(setMe).catch(() => {}); }, 60000);
    return () => { clearInterval(iv); clearInterval(iv2); };
  }, [refresh, loadFeed]);

  const setOnline = async (v: boolean) => {
    setToggling(true);
    try {
      await apiSetOnline(v);
      if (v) seen.current = null;                 // заказы, уже висящие в ленте, не «звеним»
      await refresh();
    } finally { setToggling(false); }
  };

  const online = feed?.online ?? me?.profile.is_available ?? false;

  // Поток заявок (30 с → 60 с → 30 с …) ведёт сервер — один на врача, сколько бы вкладок ни было открыто.
  // Лента обновляется каждые 5 секунд, новая заявка появляется окном со звуком.

  return (
    <VetCtx.Provider value={{ me, feed, online, toggling, setOnline, refresh, alert, dismissAlert: () => setAlert(null) }}>
      {children}
    </VetCtx.Provider>
  );
}

export function useVet() {
  const c = useContext(VetCtx);
  if (!c) throw new Error('useVet outside provider');
  return c;
}
