// ═══════════════════════════════════════════════════════════════════
//  Языки кабинета врача: русский (основной), английский, турецкий, арабский.
//  Интерфейс написан на русском; при другом языке переводчик на лету
//  заменяет текст на экране по словарю (i18nDict.ts), включая данные с сервера.
//  Имена, клички и адреса, которых нет в словаре, пишутся латиницей.
// ═══════════════════════════════════════════════════════════════════
import { DICT, PATTERNS } from './i18nDict';

export type Lang = 'ru' | 'en' | 'tr' | 'ar';
export const LANGS: { k: Lang; label: string; short: string; flag: string }[] = [
  { k: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { k: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { k: 'tr', label: 'Türkçe', short: 'TR', flag: '🇹🇷' },
  { k: 'ar', label: 'العربية', short: 'AR', flag: '🇸🇦' },
];
const KEY = 'vet_lang';
const IDX: Record<Lang, number> = { ru: -1, en: 0, tr: 1, ar: 2 };

export function getLang(): Lang {
  try { const l = localStorage.getItem(KEY) as Lang | null; if (l && l in IDX) return l; } catch { /* */ }
  return 'ru';
}
export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* */ }
  location.reload();
}

// Язык для дат и чисел
export const LOC = ({ ru: 'ru-RU', en: 'en-GB', tr: 'tr-TR', ar: 'ar-u-nu-latn' } as const)[getLang()];

// ── Латиница для имён, кличек и адресов ──
const TR_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function translit(s: string) {
  return s.replace(/[А-Яа-яЁё]/g, (ch) => {
    const low = ch.toLowerCase();
    const r = TR_MAP[low] ?? ch;
    return ch === low ? r : r.charAt(0).toUpperCase() + r.slice(1);
  });
}

const CYR = /[А-Яа-яЁё]/;
const NB = /\u00A0/g;
const DICTN: Record<string, [string, string, string]> = {};
for (const [k, v] of Object.entries(DICT)) DICTN[k.replace(NB, ' ')] = v;
const compiled = PATTERNS.map(([ru, tr]) => {
  const esc = ru.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\}/g, '(.+?)');
  return { re: new RegExp('^' + esc + '$'), tr };
});

function fill(tpl: string, args: string[], idx: number) {
  let i = 0;
  return tpl.replace(/\{(\d?)\}/g, (_m, n) => {
    const v = args[n === '' ? i++ : Number(n)] ?? '';
    return translate(v, idx);
  });
}

function nameLike(core: string) {
  const words = core.split(/\s+/);
  return words.length <= 4 && words.every((w) => !/[А-Яа-яЁё]/.test(w) || /^[«("]?[А-ЯЁ]/.test(w) || /^(ул\.|пр\.|д\.|кв\.|наб\.)$/.test(w));
}

// Числа с единицами измерения: «3 кг», «150–170 г», «18 месяцев», «< 60 мин»
const UNITS: Record<string, [string, string, string]> = {
  'кг': ['kg', 'kg', 'كغ'], 'г': ['g', 'g', 'غ'], 'мг': ['mg', 'mg', 'ملغ'], 'мм': ['mm', 'mm', 'مم'], 'см': ['cm', 'cm', 'سم'], 'м': ['m', 'm', 'م'], 'км': ['km', 'km', 'كم'],
  'мл': ['ml', 'ml', 'مل'], 'л': ['l', 'l', 'ل'], 'шт.': ['pcs', 'adet', 'قطعة'], 'шт': ['pcs', 'adet', 'قطعة'], 'ккал/кг': ['kcal/kg', 'kcal/kg', 'سعرة/كغ'], 'ккал': ['kcal', 'kcal', 'سعرة'],
  'мг/кг': ['mg/kg', 'mg/kg', 'ملغ/كغ'], 'мин': ['min', 'dk', 'د'], 'ч': ['h', 'sa', 'س'], 'часа': ['hours', 'saat', 'ساعات'], 'часов': ['hours', 'saat', 'ساعات'], 'час': ['hour', 'saat', 'ساعة'],
  'дней': ['days', 'gün', 'أيام'], 'дня': ['days', 'gün', 'أيام'], 'день': ['day', 'gün', 'يوم'], 'недели': ['weeks', 'hafta', 'أسابيع'], 'недель': ['weeks', 'hafta', 'أسابيع'],
  'месяцев': ['months', 'ay', 'أشهر'], 'месяца': ['months', 'ay', 'أشهر'], 'месяц': ['month', 'ay', 'شهر'], 'мес.': ['mo.', 'ay', 'شهر'], 'мес': ['mo.', 'ay', 'شهر'],
  'лет': ['years', 'yaş', 'سنوات'], 'года': ['years', 'yaş', 'سنوات'], 'год': ['year', 'yaş', 'سنة'], 'мкг': ['µg', 'µg', 'مكغ'], 'МЕ/кг': ['IU/kg', 'IU/kg', 'وحدة/كغ'], 'МЕ': ['IU', 'IU', 'وحدة'],
};
function measure(core: string, idx: number): string | null {
  const m = core.match(/^((?:[<>≈~+−-]\s*)?(?:от\s|до\s|более\s)?[\d\s.,–×/-]*\d)\s*([А-Яа-яЁё./]+)$/);
  if (!m) return null;
  const u = UNITS[m[2]];
  if (!u) return null;
  const pre = m[1].replace(/^от\s/, ['from ', '', 'من '][idx]).replace(/^до\s/, ['up to ', '', 'حتى '][idx]).replace(/^более\s/, ['over ', '', 'أكثر من '][idx]);
  const sfx = idx === 1 ? (/^от\s/.test(m[1]) ? '’dan itibaren' : /^до\s/.test(m[1]) ? '’a kadar' : /^более\s/.test(m[1]) ? ' üzeri' : '') : '';
  return pre + ' ' + u[idx] + sfx;
}

// Ищем перевод фразы целиком: словарь → шаблон → составная фраза (только если переведены ВСЕ части)
function find(core: string, idx: number): string | null {
  if (!CYR.test(core)) return core;
  const d = DICTN[core.replace(NB, ' ')];
  if (d) return d[idx];
  const ms = measure(core, idx);
  if (ms) return ms;
  for (const p of compiled) {
    const m = core.match(p.re) ?? core.replace(NB, ' ').match(p.re);
    if (m) return fill(p.tr[idx], m.slice(1), idx);
  }
  for (const sep of [' · ', ' — ', ' / ', ', ', ': ']) {
    if (!core.includes(sep)) continue;
    const parts = core.split(sep).map((x) => {
      const mm = x.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      if (!mm[2]) return x;
      const r = find(mm[2], idx) ?? (nameLike(mm[2]) ? translit(mm[2]) : null);
      return r === null ? null : mm[1] + r + mm[3];
    });
    if (parts.every((x) => x !== null)) return parts.join(sep);
  }
  const m = core.match(/^([^\d]*?)(\s*[+−-]?[\d\s.,%₽]+\s*)([^\d]*)$/);
  if (m && (m[1].trim() || m[3].trim())) {
    const a = m[1].trim() ? find(m[1].trim(), idx) : '';
    const b = m[3].trim() ? find(m[3].trim(), idx) : '';
    if (a !== null && b !== null) return m[1].replace(m[1].trim(), a) + m[2] + m[3].replace(m[3].trim(), b);
  }
  return null;
}

function translate(core: string, idx: number): string {
  const r = find(core, idx);
  if (r !== null) return r;
  // для проверки: какие фразы не нашлись в словаре
  try { ((window as unknown as { __i18nMissing?: Set<string> }).__i18nMissing ??= new Set()).add(core); } catch { /* */ }
  // имена, клички, адреса — латиницей; непереведённые предложения — как есть, без «абракадабры»
  return nameLike(core) ? translit(core) : core;
}

function translateEdge(s: string, idx: number) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return m[1] + (m[2] ? translate(m[2], idx) : '') + m[3];
}

export function t(s: string): string {
  const lang = getLang();
  if (lang === 'ru') return s;
  return translateEdge(s, IDX[lang]);
}

// ── Перевод того, что уже нарисовано на экране ──
const ATTRS = ['placeholder', 'title', 'aria-label'];
function walk(node: Node, idx: number) {
  if (node.nodeType === 3) {
    const v = node.nodeValue ?? '';
    if (CYR.test(v)) { const r = translateEdge(v, idx); if (r !== v) node.nodeValue = r; }   // меняем только если перевод другой — иначе бесконечный цикл
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || el.hasAttribute('data-notr')) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v && CYR.test(v)) { const r = translateEdge(v, idx); if (r !== v) el.setAttribute(a, r); } }
  if (tag === 'INPUT') return;
  for (let c = el.firstChild; c; c = c.nextSibling) walk(c, idx);
}

export function startTranslator() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (lang === 'ru') return;
  const idx = IDX[lang];
  document.title = t(document.title);
  const run = (n: Node) => walk(n, idx);
  run(document.body);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') run(m.target);
      else if (m.type === 'attributes') run(m.target);
      else m.addedNodes.forEach(run);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // Окна confirm/alert тоже на выбранном языке
  const c = window.confirm.bind(window); window.confirm = (msg?: string) => c(msg ? t(msg) : msg);
  const a = window.alert.bind(window); window.alert = (msg?: string) => a(msg ? t(String(msg)) : msg);
}
