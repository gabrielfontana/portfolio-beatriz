// Amostras de cor: hover/foco mostram o destaque; clique/toque liga e desliga (uma por vez na página).
// Amostras com aria-disabled="true" (look fora de foco no line-up) não destacam nem selecionam.
// Listeners delegados no document: valem para qualquer página, inclusive após o ClientRouter.

function aplicar(croqui: HTMLElement, chave: string | null) {
  croqui.querySelector('.croqui__palco')?.toggleAttribute('data-destacando', chave !== null);
  croqui.querySelectorAll<HTMLElement>('.croqui__realce').forEach((r) => {
    r.classList.toggle('ativo', r.dataset.realce === chave);
  });
}

function fixada(croqui: HTMLElement): string | null {
  return croqui.querySelector<HTMLElement>('[data-amostra][aria-pressed="true"]')?.dataset.amostra ?? null;
}

/** Desliga a cor selecionada de um croqui e apaga o destaque dele. */
export function soltar(croqui: HTMLElement) {
  croqui.querySelectorAll('[data-amostra][aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  aplicar(croqui, null);
}

function amostraDe(evento: Event) {
  const botao = (evento.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-amostra]');
  const croqui = botao?.closest<HTMLElement>('[data-croqui]');
  if (!botao || !croqui || botao.getAttribute('aria-disabled') === 'true') return null;
  return { botao, croqui };
}

document.addEventListener('click', (evento) => {
  const alvo = amostraDe(evento);
  if (!alvo) return;
  const ligar = alvo.botao.getAttribute('aria-pressed') !== 'true';
  document.querySelectorAll<HTMLElement>('[data-croqui]').forEach((c) => {
    if (c !== alvo.croqui && fixada(c)) soltar(c);
  });
  alvo.croqui.querySelectorAll<HTMLButtonElement>('[data-amostra]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b === alvo.botao && ligar));
  });
  aplicar(alvo.croqui, ligar ? alvo.botao.dataset.amostra ?? null : null);
});

document.addEventListener('pointerover', (evento) => {
  if ((evento as PointerEvent).pointerType !== 'mouse') return;
  const alvo = amostraDe(evento);
  if (alvo) aplicar(alvo.croqui, alvo.botao.dataset.amostra ?? null);
});

document.addEventListener('pointerout', (evento) => {
  if ((evento as PointerEvent).pointerType !== 'mouse') return;
  const alvo = amostraDe(evento);
  if (alvo && !alvo.botao.contains((evento as PointerEvent).relatedTarget as Node | null)) {
    aplicar(alvo.croqui, fixada(alvo.croqui));
  }
});

document.addEventListener('focusin', (evento) => {
  const alvo = amostraDe(evento);
  if (alvo) aplicar(alvo.croqui, alvo.botao.dataset.amostra ?? null);
});

document.addEventListener('focusout', (evento) => {
  const alvo = amostraDe(evento);
  if (alvo) aplicar(alvo.croqui, fixada(alvo.croqui));
});
