// Телефонная клавиатура: пока врач печатает, прячем нижнее меню,
// а поле ввода прокручиваем в середину видимой части экрана — над клавиатурой.

const TEXT_INPUT = 'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]), textarea, select';

export function setupKeyboard() {
  const root = document.documentElement;
  const isPhone = () => window.matchMedia('(max-width: 767px)').matches;
  const activeField = () => {
    const el = document.activeElement as HTMLElement | null;
    return el && el.matches?.(TEXT_INPUT) ? el : null;
  };
  let hideTimer = 0;
  let showTimer = 0;

  // Показать поле целиком: во всплывающем окне прокручиваем само окно, на странице — страницу
  const reveal = (el: HTMLElement) => {
    const sheet = el.closest('.sheet, .incoming-sheet') as HTMLElement | null;
    if (sheet) {
      const r = el.getBoundingClientRect();
      const s = sheet.getBoundingClientRect();
      if (r.top < s.top + 8 || r.bottom > s.bottom - 8) sheet.scrollBy({ top: r.top - s.top - s.height / 3, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  // Видимая часть экрана (без клавиатуры) — для всплывающих окон
  const vv = window.visualViewport;
  const syncHeight = () => {
    root.style.setProperty('--vvh', `${Math.round(vv ? vv.height : window.innerHeight)}px`);
    root.style.setProperty('--vvt', `${Math.round(vv ? vv.offsetTop : 0)}px`);
  };
  const onViewport = () => {
    syncHeight();
    const el = activeField();
    if (el && isPhone()) {
      root.classList.add('kbd-open');
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => reveal(el), 120);   // клавиатура выехала — ещё раз показываем поле
    }
  };
  syncHeight();
  vv?.addEventListener('resize', onViewport);
  vv?.addEventListener('scroll', syncHeight);
  window.addEventListener('resize', onViewport);

  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (!isPhone() || !el.matches?.(TEXT_INPUT)) return;
    window.clearTimeout(hideTimer);
    root.classList.add('kbd-open');
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => { syncHeight(); reveal(el); }, 320);
  });

  document.addEventListener('focusout', () => {
    // если фокус перешёл в соседнее поле — меню не мигает
    hideTimer = window.setTimeout(() => {
      if (!activeField()) root.classList.remove('kbd-open');
      syncHeight();
    }, 150);
  });
}
