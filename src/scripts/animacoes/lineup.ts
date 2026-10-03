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
    const limpezas: Array<() => void> = [];
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--desfile');
      // Margens que deixam o primeiro e o último look chegarem ao centro da tela (e ficarem em foco).
      const respiro = () => {
        const primeiro = cards[0];
        const ultimo = cards[cards.length - 1];
        trilho.style.paddingLeft = `${Math.max(0, window.innerWidth / 2 - primeiro.offsetWidth / 2)}px`;
        trilho.style.paddingRight = `${Math.max(0, window.innerWidth / 2 - ultimo.offsetWidth / 2)}px`;
      };
      respiro();
      window.addEventListener('resize', respiro);
      const distancia = () => Math.max(0, trilho.scrollWidth - window.innerWidth);
      const atualizar = () => focar(cards, maisPertoDoCentro(cards));
      const tween = gsap.to(trilho, {
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

      // Teclado: o navegador revela o elemento focado rolando a seção (overflow hidden) na
      // horizontal, o que se somaria ao x do GSAP. Em vez disso, zera essa rolagem e leva a
      // página até o ponto do desfile em que o look focado fica no centro.
      const semRolagemLateral = () => {
        if (secao.scrollLeft) secao.scrollLeft = 0;
      };
      const aoFocar = (evento: FocusEvent) => {
        semRolagemLateral();
        const card = (evento.target as HTMLElement).closest<HTMLElement>('[data-croqui]');
        const st = tween.scrollTrigger;
        if (!card || !st) return;
        const alvo = card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
        window.scrollTo({ top: st.start + Math.min(Math.max(alvo, 0), distancia()), behavior: 'instant' });
        atualizar();
      };
      secao.addEventListener('scroll', semRolagemLateral);
      secao.addEventListener('focusin', aoFocar);
      limpezas.push(() => {
        window.removeEventListener('resize', respiro);
        trilho.style.removeProperty('padding-left');
        trilho.style.removeProperty('padding-right');
        secao.removeEventListener('scroll', semRolagemLateral);
        secao.removeEventListener('focusin', aoFocar);
      });
    });
    return () => {
      limpezas.forEach((f) => f());
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
