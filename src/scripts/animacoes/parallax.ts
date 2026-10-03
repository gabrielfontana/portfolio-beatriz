import type { gsap as GSAP } from 'gsap';

/** A foto desliza dentro da moldura enquanto a página rola. */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="parallax"]').forEach((moldura) => {
      const img = moldura.querySelector('img');
      if (!img) return;
      gsap.fromTo(
        img,
        { yPercent: -6, scale: 1.12 },
        { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: moldura, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    });
  });
  return () => ctx.revert();
}
