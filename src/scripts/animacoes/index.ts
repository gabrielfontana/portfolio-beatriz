import type { gsap as GSAP } from 'gsap';

type Modulo = { iniciar: (gsap: typeof GSAP) => () => void };

let limpezas: Array<() => void> = [];
let ciclo = 0;

function limpar() {
  limpezas.forEach((f) => f());
  limpezas = [];
}

async function iniciar() {
  limpar();
  const meuCiclo = ++ciclo;
  const raiz = document.documentElement;
  raiz.dataset.animacoesCiclo = String(meuCiclo);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    raiz.dataset.animacoes = 'reduzidas';
    return;
  }
  if (!document.querySelector('[data-anim], [data-letra]')) {
    raiz.dataset.animacoes = 'sem-alvos';
    return;
  }

  // GSAP só é baixado quando há algo para animar.
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);
  const modulos: Modulo[] = await Promise.all([
    import('./capa'),
    import('./revelar'),
    import('./parallax'),
    import('./processo'),
    import('./linha'),
  ]);
  if (meuCiclo !== ciclo) return; // outra navegação começou enquanto carregava

  limpezas = modulos.map((m) => m.iniciar(gsap));
  ScrollTrigger.refresh();
  raiz.dataset.animacoes = 'ativas';
  raiz.dataset.gatilhos = String(ScrollTrigger.getAll().length);
}

// astro:page-load dispara no primeiro carregamento e a cada navegação do ClientRouter.
document.addEventListener('astro:page-load', () => void iniciar());
document.addEventListener('astro:before-swap', limpar);
