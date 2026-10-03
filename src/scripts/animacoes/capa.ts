import type { gsap as GSAP } from 'gsap';

/**
 * Entrada da capa: letras sobem (mascaradas pelo overflow), foto é "revelada", chamadas deslizam.
 * Sem animar opacidade: o texto da capa é o maior elemento da tela (LCP) e precisa pintar de imediato.
 */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    if (!document.querySelector('.capa')) return;
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .from('[data-letra]', { yPercent: 110, duration: 1.1, stagger: 0.06 })
      .from('.capa__foto', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2 }, '-=0.8')
      .from('[data-chamada]', { x: -30, duration: 0.8, stagger: 0.12 }, '-=1.2');
  });
  return () => ctx.revert();
}
