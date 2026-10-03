import type { gsap as GSAP } from 'gsap';

function focar(cards: HTMLElement[], escolhido: HTMLElement | undefined) {
  cards.forEach((c) => c.toggleAttribute('data-em-foco', c === escolhido));
}

function maisPertoDoCentro(cards: HTMLElement[]): HTMLElement | undefined {
  const centro = window.innerWidth / 2;
  let melhor: HTMLElement | undefined;
  let menor = Infinity;
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - centro);
    if (d < menor) {
      menor = d;
      melhor = c;
    }
  }
  return melhor;
}

/**
 * Desktop: a seção fica presa e a rolagem leva a fila de croquis na horizontal (desfile).
 * Celular: carrossel com scroll-snap; o look encaixado no centro fica em foco.
 */
export function iniciar(gsap: typeof GSAP): () => void {
  const secoes = gsap.utils.toArray<HTMLElement>('[data-anim="lineup"]');
  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', () => {
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--desfile');
      const distancia = () => Math.max(0, trilho.scrollWidth - window.innerWidth);
      const atualizar = () => focar(cards, maisPertoDoCentro(cards));
      gsap.to(trilho, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: secao,
          pin: true,
          start: 'top top',
          end: () => `+=${distancia()}`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: atualizar,
          onRefresh: atualizar,
        },
      });
      atualizar();
    });
    return () => {
      secoes.forEach((s) => {
        s.classList.remove('lineup--desfile');
        s.querySelectorAll('[data-em-foco]').forEach((c) => c.removeAttribute('data-em-foco'));
      });
    };
  });

  mm.add('(max-width: 767px)', () => {
    const observadores: IntersectionObserver[] = [];
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--carrossel');
      const io = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) if (e.isIntersecting) focar(cards, e.target as HTMLElement);
        },
        { root: trilho, threshold: 0.6 },
      );
      cards.forEach((c) => io.observe(c));
      observadores.push(io);
    });
    return () => {
      observadores.forEach((o) => o.disconnect());
      secoes.forEach((s) => {
        s.classList.remove('lineup--carrossel');
        s.querySelectorAll('[data-em-foco]').forEach((c) => c.removeAttribute('data-em-foco'));
      });
    };
  });

  return () => mm.revert();
}
