import { lerFolhas, ouvir, reduzido, type Limpeza } from './comum';
import { abrirVisualizador } from './visualizador';

/**
 * Varal: as folhas balançam com a velocidade da rolagem (da página e do próprio varal), como roupa no
 * vento; com o mouse dá para arrastar o varal; tocar sem arrastar abre o grupo no visualizador.
 * Nas folhas coloridas, a cor desce sobre o grafite quando a folha aparece.
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const varal = raiz.querySelector<HTMLElement>('[data-varal]');
  if (!varal) return () => {};
  const trilho = varal.querySelector<HTMLElement>('[data-trilho]')!;
  const grupos = Array.from(varal.querySelectorAll<HTMLElement>('[data-grupo]'));
  const limpezas: Limpeza[] = [];

  // a folha de cima inteira (grafite e cor) sai do varal enquanto está aberta
  const abrir = (g: HTMLElement) => abrirVisualizador(lerFolhas(g), 0, g.querySelector<HTMLElement>('.folha--topo') ?? g);

  // arrastar com o mouse; tocar/clicar sem arrastar abre
  let arrasto: { x: number; y: number; scroll: number; moveu: boolean } | null = null;
  limpezas.push(
    ouvir(trilho, 'pointerdown', (e) => {
      const ev = e as PointerEvent;
      arrasto = { x: ev.clientX, y: ev.clientY, scroll: trilho.scrollLeft, moveu: false };
      if (ev.pointerType === 'mouse') trilho.classList.add('arrastando');
    }),
    ouvir(trilho, 'pointermove', (e) => {
      const ev = e as PointerEvent;
      if (!arrasto) return;
      if (Math.abs(ev.clientX - arrasto.x) > 6) arrasto.moveu = true;
      if (ev.pointerType === 'mouse' && ev.buttons) trilho.scrollLeft = arrasto.scroll - (ev.clientX - arrasto.x);
    }),
    ouvir(trilho, 'pointerup', (e) => {
      const ev = e as PointerEvent;
      const g = (ev.target as HTMLElement).closest<HTMLElement>('[data-grupo]');
      if (arrasto && !arrasto.moveu && Math.abs(ev.clientY - arrasto.y) < 8 && g) abrir(g);
      arrasto = null;
      trilho.classList.remove('arrastando');
    }),
    ouvir(trilho, 'pointercancel', () => {
      arrasto = null;
      trilho.classList.remove('arrastando');
    }),
    // teclado (Enter/Espaço no botão do grupo): o click sem ponteiro abre
    ouvir(trilho, 'click', (e) => {
      const ev = e as MouseEvent;
      if (ev.detail !== 0) return; // cliques de ponteiro já foram tratados no pointerup
      const g = (ev.target as HTMLElement).closest<HTMLElement>('[data-grupo]');
      if (g) abrir(g);
    }),
  );
  if (reduzido()) return () => limpezas.forEach((f) => f());

  // traço → cor quando a folha aparece
  const coloridos = grupos.filter((g) => g.dataset.tipo === 'colorido');
  const revelar = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((ent) => {
        if (!ent.isIntersecting) return;
        revelar.unobserve(ent.target);
        window.setTimeout(() => ((ent.target as HTMLElement).dataset.revelada = 'sim'), 300 + Math.random() * 400);
      }),
    { threshold: 0.4 },
  );
  coloridos.forEach((g) => {
    g.dataset.revelada = 'nao';
    revelar.observe(g);
  });

  // balanço: cada folha é uma mola empurrada pelo "vento" (velocidade da rolagem)
  const pendurados = Array.from(varal.querySelectorAll<HTMLElement>('[data-pendurado]')).map((el, i) => ({ el, a: 0, v: 0, k: 0.035 + (i % 4) * 0.006 }));
  let ultX = trilho.scrollLeft;
  let ultY = window.scrollY;
  let vento = 0;
  let raf = 0;
  const passo = () => {
    const dx = trilho.scrollLeft - ultX;
    const dy = window.scrollY - ultY;
    ultX = trilho.scrollLeft;
    ultY = window.scrollY;
    vento = vento * 0.85 + (-dx * 0.5 + dy * 0.12);
    let parado = Math.abs(vento) < 0.05;
    for (const p of pendurados) {
      p.v += (Math.max(-14, Math.min(14, vento)) - p.a) * p.k;
      p.v += -p.a * 0.02;
      p.v *= 0.92;
      p.a += p.v;
      p.el.style.setProperty('--balanco', `${p.a.toFixed(2)}deg`);
      if (Math.abs(p.a) > 0.05 || Math.abs(p.v) > 0.05) parado = false;
    }
    raf = parado ? 0 : requestAnimationFrame(passo);
  };
  const acordar = () => {
    if (!raf) raf = requestAnimationFrame(passo);
  };
  limpezas.push(ouvir(trilho, 'scroll', acordar, { passive: true }), ouvir(window, 'scroll', acordar, { passive: true }));

  return () => {
    limpezas.forEach((f) => f());
    revelar.disconnect();
    cancelAnimationFrame(raf);
    coloridos.forEach((g) => delete g.dataset.revelada);
    pendurados.forEach((p) => p.el.style.removeProperty('--balanco'));
  };
}
