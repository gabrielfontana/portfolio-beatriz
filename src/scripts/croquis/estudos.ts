import { ouvir, reduzido, type Limpeza } from './comum';

const ESCALA = 2.4;

/**
 * Leitura guiada dos estudos: uma prancha por vez; "Começar"/"Próximo" aproxima a prancha até cada
 * anotação, em ordem (sem mostrar além das bordas). Os pontos ficam escondidos: só guardam a posição.
 * Com movimento reduzido, o CSS tira a transição (o zoom vira um corte direto).
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const area = raiz.querySelector<HTMLElement>('[data-estudos]');
  if (!area) return () => {};
  const estudos = Array.from(area.querySelectorAll<HTMLElement>('[data-estudo]'));
  const seletor = area.querySelector<HTMLElement>('[data-seletor]')!;
  const botoesSeletor = Array.from(seletor.querySelectorAll<HTMLButtonElement>('[data-ir]'));
  area.classList.add('estudos--ativo');
  seletor.hidden = false;

  let atual = Math.max(0, estudos.findIndex((e) => e.hasAttribute('data-atual')));
  const anotacao = new Map<HTMLElement, number | null>(estudos.map((e) => [e, null]));

  function enquadrar(estudo: HTMLElement) {
    const quadro = estudo.querySelector<HTMLElement>('[data-quadro]')!;
    const camada = estudo.querySelector<HTMLElement>('[data-camada]')!;
    const pontos = Array.from(camada.querySelectorAll<HTMLElement>('[data-ponto]'));
    const a = anotacao.get(estudo);
    const largura = quadro.clientWidth;
    const altura = quadro.clientHeight;
    let escala = 1;
    let tx = 0;
    let ty = 0;
    if (a != null) {
      escala = ESCALA;
      const px = (parseFloat(pontos[a].style.left) / 100) * largura;
      const py = (parseFloat(pontos[a].style.top) / 100) * altura;
      tx = Math.min(0, Math.max(largura - largura * escala, largura / 2 - px * escala));
      ty = Math.min(0, Math.max(altura - altura * escala, altura / 2 - py * escala));
    }
    camada.style.setProperty('--s', String(escala));
    camada.style.transform = `translate(${tx}px, ${ty}px) scale(${escala})`;
  }

  function pintar(estudo: HTMLElement) {
    const a = anotacao.get(estudo) ?? null;
    const n = estudo.querySelectorAll('[data-ponto]').length;
    // Na tela não aparece texto nenhum; o contador é só para leitores de tela.
    estudo.querySelector<HTMLElement>('[data-contador]')!.textContent = a == null ? 'Prancha inteira' : `Detalhe ${a + 1} de ${n}`;
    const anterior = estudo.querySelector<HTMLButtonElement>('[data-anterior]')!;
    const proxima = estudo.querySelector<HTMLButtonElement>('[data-proxima]')!;
    anterior.disabled = a == null;
    proxima.textContent = a == null ? 'Começar' : a === n - 1 ? 'Próximo estudo' : 'Próximo';
    estudo.querySelector<HTMLElement>('[data-inteira]')!.hidden = a == null;
    enquadrar(estudo);
    // no celular os botões ficam embaixo da prancha: traz a prancha de volta à vista se ela saiu da tela
    if (a != null) {
      const q = estudo.querySelector<HTMLElement>('[data-quadro]')!.getBoundingClientRect();
      const topoUtil = (document.querySelector<HTMLElement>('.abas')?.getBoundingClientRect().bottom ?? 0);
      if (q.top < topoUtil) estudo.scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' });
    }
  }

  function abrirEstudo(i: number) {
    atual = (i + estudos.length) % estudos.length;
    estudos.forEach((e, k) => {
      e.toggleAttribute('data-atual', k === atual);
      if (k !== atual) anotacao.set(e, null);
    });
    botoesSeletor.forEach((b, k) => b.setAttribute('aria-current', String(k === atual)));
    pintar(estudos[atual]);
  }

  const limpezas: Limpeza[] = [];
  for (const estudo of estudos) {
    estudo.querySelector<HTMLElement>('[data-so-js]')!.hidden = false;
    const n = estudo.querySelectorAll('[data-ponto]').length;
    limpezas.push(
      ouvir(estudo.querySelector<HTMLElement>('[data-proxima]')!, 'click', () => {
        const a = anotacao.get(estudo);
        if (a == null) anotacao.set(estudo, 0);
        else if (a < n - 1) anotacao.set(estudo, a + 1);
        else return abrirEstudo(atual + 1);
        pintar(estudo);
      }),
      ouvir(estudo.querySelector<HTMLElement>('[data-anterior]')!, 'click', () => {
        const a = anotacao.get(estudo);
        anotacao.set(estudo, a != null && a > 0 ? a - 1 : null);
        pintar(estudo);
      }),
      ouvir(estudo.querySelector<HTMLElement>('[data-inteira]')!, 'click', () => {
        anotacao.set(estudo, null);
        pintar(estudo);
      }),
    );
  }
  limpezas.push(
    ouvir(seletor, 'click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ir]');
      if (b) abrirEstudo(Number(b.dataset.ir));
    }),
    ouvir(window, 'resize', () => enquadrar(estudos[atual])),
  );
  abrirEstudo(atual);

  return () => {
    limpezas.forEach((f) => f());
    area.classList.remove('estudos--ativo');
    seletor.hidden = true;
  };
}
