import axios from 'axios';

// Тот же сервер, что и у сайта для клиентов. Токен врача хранится отдельно от токена клиента.
const TOKEN = 'vet_token';
const USER = 'vet_user';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN);
      localStorage.removeItem(USER);
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const errText = (e: unknown, fallback = 'Что-то пошло не так') =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

export const storage = { TOKEN, USER };

// ── Типы ──────────────────────────────────────────────────────────
export interface Tier { key: string; name: string; icon: string; percent: number; minOrders: number; minRating: number; color: string }
export interface TierInfo { current: Tier; next: Tier | null; orders_to_next: number; rating_ok_for_next: boolean; progress: number }
export interface Metrics {
  completed_total: number; completed_30d: number; completed_today: number; completed_week: number;
  earned_today: number; earned_week: number; earned_month: number; earned_total: number;
  rating: number; reviews: number; avg_accept_min: number | null; clients: number; return_rate: number;
  acceptance_rate: number; hours_30d: number; hours_today: number;
}
export interface Profile {
  id: number; name: string; phone: string; email?: string; avatar_url?: string; photo_url?: string;
  specialization?: string; experience_years?: number; bio?: string; city?: string; district?: string;
  education?: string; transport?: string; daily_goal?: number; is_available: boolean; online_since?: string | null;
  joined_at?: string; is_verified?: boolean;
  radius_km?: number; service_ids?: number[]; schedule?: Record<string, { on: boolean; from: string; to: string }> | null;
  payout_bank?: string | null; payout_card?: string | null; inn?: string | null; auto_payout?: boolean;
}
export interface Me { profile: Profile; metrics: Metrics; tier: TierInfo; tiers: Tier[]; balance: number }
export interface Order {
  id: number; status: string; address: string; scheduled_at: string; created_at: string; notes?: string;
  total_price: number; bonus_used?: number; ai_triage?: { urgency?: string; summary?: string; [k: string]: unknown } | null;
  voice_url?: string | null; accepted_at?: string; completed_at?: string; vet_percent?: number; vet_payout?: number;
  vet_conclusion?: string; client_rating?: number; client_review?: string;
  client_name: string; client_phone?: string | null; client_avatar?: string;
  pet_id?: number; pet_name?: string; pet_species?: string; pet_breed?: string; pet_age?: number; pet_weight?: string; pet_photo?: string;
  service_name?: string; service_icon?: string; duration_minutes?: number; payout_estimate?: number;
}
export interface OrderDetail extends Order {
  is_mine: boolean; percent: number; passport_id?: string; pet_diagnoses?: string; pet_previous_treatment?: string;
  pet_current_concern?: string; pet_notes?: string; pet_sex?: string; pet_birth_date?: string; pet_microchip?: string; pet_color?: string;
  history: { status: string; comment?: string; created_at: string }[];
  visits: { id: number; scheduled_at: string; vet_conclusion?: string; service_name?: string; vet_name?: string }[];
}
export interface Feed { online: boolean; percent: number; incoming: Order[]; active: Order[] }

// ── Вызовы ────────────────────────────────────────────────────────
export const loginReq = (phone: string, password: string) => api.post('/auth/login', { phone, password }).then((r) => r.data);
export const registerReq = (d: { name: string; phone: string; password: string; email?: string }) =>
  api.post('/auth/register', { ...d, role: 'vet' }).then((r) => r.data);

export const getMe = () => api.get<Me>('/vet/me').then((r) => r.data);
export const updateProfile = (d: Record<string, unknown>) => api.patch('/vet/profile', d).then((r) => r.data);
export const setOnline = (online: boolean) => api.patch('/vet/status', { online }).then((r) => r.data);
export const getFeed = () => api.get<Feed>('/vet/feed').then((r) => r.data);
export const getOrders = (tab: 'active' | 'history') => api.get<Order[]>('/vet/orders', { params: { tab } }).then((r) => r.data);
export const getOrder = (id: number) => api.get<OrderDetail>(`/vet/orders/${id}`).then((r) => r.data);
export const acceptOrder = (id: number) => api.post(`/vet/orders/${id}/accept`).then((r) => r.data);
export const declineOrder = (id: number) => api.post(`/vet/orders/${id}/decline`).then((r) => r.data);
export const releaseOrder = (id: number) => api.post(`/vet/orders/${id}/release`).then((r) => r.data);
export const nextStep = (id: number, body: { conclusion?: string; final_price?: number } = {}) =>
  api.post(`/vet/orders/${id}/next`, body).then((r) => r.data as { status: string });
export const getFinance = (period: string) => api.get('/vet/finance', { params: { period } }).then((r) => r.data);
export const addExpense = (d: { category: string; amount: number; note?: string }) => api.post('/vet/expenses', d).then((r) => r.data);
export const deleteExpense = (id: number) => api.delete(`/vet/expenses/${id}`).then((r) => r.data);
export const requestPayout = (amount: number) => api.post('/vet/payouts', { amount }).then((r) => r.data);
export const getKpi = () => api.get('/vet/kpi').then((r) => r.data);
export const getLeague = (metric: string) => api.get('/vet/league', { params: { metric } }).then((r) => r.data);
export const getReviews = () => api.get('/vet/reviews').then((r) => r.data);
export const getNews = () => api.get('/vet/news').then((r) => r.data);
export const uploadPhoto = (image: string) => api.post('/vet/photo', { image }).then((r) => r.data as { photo_url: string });
export const changePassword = (old_password: string, new_password: string) => api.post('/vet/password', { old_password, new_password }).then((r) => r.data);
export const getServices = () => api.get('/services').then((r) => r.data as { id: number; name: string; icon: string; price_from: number }[]);
export const demoIncoming = () => api.post('/vet/demo/incoming').then((r) => r.data);

export default api;
