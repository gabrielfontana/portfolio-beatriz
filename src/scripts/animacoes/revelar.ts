import type { gsap as GSAP } from 'gsap';

/** Elementos sobem e aparecem ao entrar na tela (uma vez só). */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="revelar"]').forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
  });
  return () => ctx.revert();
}
