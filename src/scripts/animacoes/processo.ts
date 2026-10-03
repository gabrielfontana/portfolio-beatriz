import type { gsap as GSAP } from 'gsap';

/** Desktop: a imagem presa (sticky) dá zoom-out e o texto aparece conforme a rolagem. */
export function iniciar(gsap: typeof GSAP): () => void {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    gsap.utils.toArray<HTMLElement>('.processo__passo').forEach((passo) => {
      const img = passo.querySelector('.processo__figura img');
      const texto = passo.querySelector('.processo__texto');
      if (img) {
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: passo, start: 'top bottom', end: 'center center', scrub: true } });
      }
      if (texto) {
        gsap.from(texto, { opacity: 0, y: 60, ease: 'power2.out', scrollTrigger: { trigger: passo, start: 'top 70%', end: 'top 30%', scrub: true } });
      }
    });
  });
  return () => mm.revert();
}
