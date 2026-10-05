import { ouvir, type Limpeza } from './comum';

/**
 * Abas presas logo abaixo do menu (no celular, o menu rola junto e as abas ficam no topo da tela):
 * a altura do menu preso vira --altura-menu,
 * e a aba da seção que ocupa o meio da tela fica marcada.
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const abas = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('[data-aba]'));
  if (abas.length === 0) return () => {};
  const menu = document.querySelector<HTMLElement>('.nav');
  const medir = () => {
    // só conta a altura do menu quando ele fica preso no topo (no celular ele rola junto)
    const preso = menu !== null && getComputedStyle(menu).position === 'sticky';
    document.documentElement.style.setProperty('--altura-menu', `${preso ? menu.offsetHeight : 0}px`);
  };
  medir();
  const ro = new ResizeObserver(medir);
  if (menu) ro.observe(menu);
  // ao cruzar o breakpoint o menu passa de solto a preso (ou o contrário) sem mudar de altura
  const largura = window.matchMedia('(max-width: 767px)');
  largura.addEventListener('change', medir);

  const marcar = (id: string) => abas.forEach((a) => a.setAttribute('aria-current', String(a.dataset.aba === id)));
  marcar(abas[0].dataset.aba ?? '');
  const io = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => e.isIntersecting && marcar(e.target.id)),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  abas.forEach((a) => {
    const secao = document.getElementById(a.dataset.aba ?? '');
    if (secao) io.observe(secao);
  });
  // Ao tocar numa aba, marca já (a rolagem até a seção confirma depois).
  const aoTocar = ouvir(raiz, 'click', (e) => {
    const aba = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-aba]');
    if (aba) marcar(aba.dataset.aba ?? '');
  });

  return () => {
    ro.disconnect();
    largura.removeEventListener('change', medir);
    io.disconnect();
    aoTocar();
    abas.forEach((a) => a.removeAttribute('aria-current'));
  };
}
