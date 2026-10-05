import { ouvir, type Limpeza } from './comum';

/**
 * Abas presas logo abaixo do menu: a altura do menu (que quebra linha no celular) vira --altura-menu,
 * e a aba da seção que ocupa o meio da tela fica marcada.
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const abas = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('[data-aba]'));
  if (abas.length === 0) return () => {};
  const menu = document.querySelector<HTMLElement>('.nav');
  const medir = () => {
    if (menu) document.documentElement.style.setProperty('--altura-menu', `${menu.offsetHeight}px`);
  };
  medir();
  const ro = new ResizeObserver(medir);
  if (menu) ro.observe(menu);

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
    io.disconnect();
    aoTocar();
    abas.forEach((a) => a.removeAttribute('aria-current'));
  };
}
