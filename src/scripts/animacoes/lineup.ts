import type { gsap as GSAP } from 'gsap';
import { soltar } from '../destaque-cor';

/**
 * Põe um look em foco. Só as cores dele ficam liberadas (as dos outros, com aria-disabled);
 * o look que sai de foco solta a cor que estava selecionada.
 */
function focar(cards: HTMLElement[], escolhido: HTMLElement | undefined) {
  for (const c of cards) {
    const emFoco = c === escolhido;
    if (c.hasAttribute('data-em-foco') === emFoco && c.hasAttribute('data-travado') !== emFoco) continue;
    c.toggleAttribute('data-em-foco', emFoco);
    c.toggleAttribute('data-travado', !emFoco);
    c.querySelectorAll('[data-amostra]').forEach((b) => b.setAttribute('aria-disabled', String(!emFoco)));
    document.querySelector(`[data-ponto="${c.id}"]`)?.setAttribute('aria-current', String(emFoco));
    if (!emFoco) soltar(c);
  }
}

function liberarTudo(secao: HTMLElement) {
  secao.querySelector<HTMLElement>('.lineup__pontos')?.setAttribute('hidden', '');
  secao.querySelectorAll('[data-ponto]').forEach((p) => p.removeAttribute('aria-current'));
  secao.querySelectorAll('[data-em-foco]').forEach((c) => c.removeAttribute('data-em-foco'));
  secao.querySelectorAll('[data-travado]').forEach((c) => c.removeAttribute('data-travado'));
  secao.querySelectorAll('[data-amostra]').forEach((b) => b.removeAttribute('aria-disabled'));
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

/** Look fora de foco que recebeu o toque/foco, ou o look da bolinha tocada (para trazê-lo ao centro). */
function lookTravado(evento: Event): HTMLElement | null {
  const alvo = evento.target as HTMLElement | null;
  const ponto = alvo?.closest<HTMLElement>('[data-ponto]');
  if (ponto) return document.getElementById(ponto.dataset.ponto ?? '');
  return alvo?.closest<HTMLElement>('[data-croqui][data-travado]') ?? null;
}

function mostrarPontos(secao: HTMLElement) {
  secao.querySelector<HTMLElement>('.lineup__pontos')?.removeAttribute('hidden');
}

/**
 * Desktop: a seção fica presa e a rolagem leva a fila de croquis na horizontal (desfile).
 * Celular: carrossel com scroll-snap; o look encaixado no centro fica em foco.
 * Nos dois, tocar num look fora de foco leva a fila até ele com um movimento suave.
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
      mostrarPontos(secao);
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

      // Leva a página até o ponto do desfile em que o look fica no centro, rolando aos poucos
      // (mais longe, um pouco mais demorado). Girar a roda ou tocar a tela interrompe.
      const rolagem = { y: 0 };
      let viagem: ReturnType<typeof gsap.to> | undefined;
      const irPara = (card: HTMLElement) => {
        const st = tween.scrollTrigger;
        if (!st) return;
        const alvo = st.start + Math.min(Math.max(card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2, 0), distancia());
        rolagem.y = window.scrollY;
        viagem?.kill();
        viagem = gsap.to(rolagem, {
          y: alvo,
          duration: Math.min(1.6, 0.7 + Math.abs(alvo - rolagem.y) / 2500),
          ease: 'power2.inOut',
          onUpdate: () => window.scrollTo({ top: rolagem.y, behavior: 'instant' }),
        });
      };
      const interromper = () => viagem?.kill();

      // Teclado: o navegador revela o elemento focado rolando a seção (overflow hidden) na
      // horizontal, o que se somaria ao x do GSAP. Em vez disso, zera essa rolagem e leva a
      // fila até o look focado.
      const semRolagemLateral = () => {
        if (secao.scrollLeft) secao.scrollLeft = 0;
      };
      const aoFocar = (evento: FocusEvent) => {
        semRolagemLateral();
        if ((evento.target as HTMLElement).closest('[data-ponto]')) return;
        const card = lookTravado(evento);
        if (card) irPara(card);
      };
      const aoTocar = (evento: MouseEvent) => {
        const card = lookTravado(evento);
        if (card) irPara(card);
      };
      secao.addEventListener('scroll', semRolagemLateral);
      secao.addEventListener('focusin', aoFocar);
      secao.addEventListener('click', aoTocar);
      window.addEventListener('wheel', interromper, { passive: true });
      window.addEventListener('touchstart', interromper, { passive: true });
      limpezas.push(() => {
        viagem?.kill();
        window.removeEventListener('resize', respiro);
        window.removeEventListener('wheel', interromper);
        window.removeEventListener('touchstart', interromper);
        trilho.style.removeProperty('padding-left');
        trilho.style.removeProperty('padding-right');
        secao.removeEventListener('scroll', semRolagemLateral);
        secao.removeEventListener('focusin', aoFocar);
        secao.removeEventListener('click', aoTocar);
      });
    });
    return () => {
      limpezas.forEach((f) => f());
      secoes.forEach((s) => {
        s.classList.remove('lineup--desfile');
        liberarTudo(s);
      });
    };
  });

  mm.add('(max-width: 767px)', () => {
    const limpezas: Array<() => void> = [];
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--carrossel');
      mostrarPontos(secao);
      focar(cards, cards[0]);
      const io = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) if (e.isIntersecting) focar(cards, e.target as HTMLElement);
        },
        { root: trilho, threshold: 0.6 },
      );
      cards.forEach((c) => io.observe(c));
      const aoTocar = (evento: MouseEvent) => {
        const card = lookTravado(evento);
        if (!card) return;
        const r = card.getBoundingClientRect();
        const t = trilho.getBoundingClientRect();
        trilho.scrollBy({ left: r.left + r.width / 2 - (t.left + t.width / 2), behavior: 'smooth' });
      };
      secao.addEventListener('click', aoTocar);
      limpezas.push(() => {
        io.disconnect();
        secao.removeEventListener('click', aoTocar);
      });
    });
    return () => {
      limpezas.forEach((f) => f());
      secoes.forEach((s) => {
        s.classList.remove('lineup--carrossel');
        liberarTudo(s);
      });
    };
  });

  return () => mm.revert();
}
