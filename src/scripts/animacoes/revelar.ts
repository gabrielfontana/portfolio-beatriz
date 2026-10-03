import type { gsap as GSAP } from 'gsap';

function jaNaTela(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

/**
 * Elementos sobem e aparecem ao entrar na tela (uma vez só).
 * O que já está visível quando o script carrega fica como está: esconder e reexibir piscaria.
 */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="revelar"]').filter((el) => !jaNaTela(el)).forEach((el) => {
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
