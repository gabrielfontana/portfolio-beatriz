import type { gsap as GSAP } from 'gsap';

/** Entrada da capa: letras sobem, foto é "revelada", chamadas deslizam. */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    if (!document.querySelector('.capa')) return;
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .from('[data-letra]', { yPercent: 110, opacity: 0, duration: 1.1, stagger: 0.06 })
      .from('.capa__foto', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2 }, '-=0.8')
      .from('[data-chamada]', { x: -30, opacity: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');
  });
  return () => ctx.revert();
}
