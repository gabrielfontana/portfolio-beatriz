/** Transição "virar a página" da revista para o ClientRouter (keyframes em global.css). */
export const virada = {
  forwards: {
    old: { name: 'virar-sai', duration: '0.45s', easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fillMode: 'both' },
    new: { name: 'virar-entra', duration: '0.55s', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'both' },
  },
  backwards: {
    old: { name: 'virar-sai-volta', duration: '0.45s', easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fillMode: 'both' },
    new: { name: 'virar-entra-volta', duration: '0.55s', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'both' },
  },
};
