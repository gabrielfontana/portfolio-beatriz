import type { gsap as GSAP } from 'gsap';

/** A linha do tempo se "desenha" conforme a rolagem (variável CSS --progresso). */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="linha"]').forEach((linha) => {
      gsap.fromTo(
        linha,
        { '--progresso': 0 },
        { '--progresso': 1, ease: 'none', scrollTrigger: { trigger: linha, start: 'top 75%', end: 'bottom 60%', scrub: true } },
      );
    });
  });
  return () => ctx.revert();
}
