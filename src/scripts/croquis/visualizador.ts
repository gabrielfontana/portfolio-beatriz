import { ouvir, reduzido, type FolhaVisor, type Limpeza } from './comum';

/** Troca de folha como num baralho: devagar (~1 s), cada carta com curva macia. */
const TROCA_MS = 1000;
/** Voo de abrir e de fechar: o mesmo ritmo e as mesmas curvas do folhear. */
const VOO_MS = TROCA_MS;
/** Até onde a carta é puxada para a esquerda antes de mudar de camada (fora do monte, inclinada). */
const FORA = 'translateX(-72%) translateY(-2%) rotate(-9deg)';
/** Carta guardada embaixo do monte: no centro, um pouco menor (coberta pela de cima). */
const NO_MONTE = 'scale(.94)';
const PUXAR = 'cubic-bezier(.35,0,.25,1)';
const GUARDAR = 'cubic-bezier(.45,0,.2,1)';
const TRAZER = 'cubic-bezier(.4,0,.2,1)';
/** Espera a imagem estar pronta para pintar, sem travar se ela demorar. */
const ESPERA_MAX = 700;

const carregadas = new Map<string, Promise<void>>();
function carregar(src: string): Promise<void> {
  let p = carregadas.get(src);
  if (!p) {
    const img = new Image();
    img.src = src;
    p = img.decode().catch(() => {});
    carregadas.set(src, p);
  }
  return p;
}
const ZOOM = 2.6;

/**
 * Chamado ao fechar com a folha que estava na tela. Quem abriu pode pôr essa folha no lugar da origem
 * (o mural põe a folha no topo da pilha) e devolve true; aí o voo de volta pousa nela.
 */
export type AoFechar = (indice: number) => boolean;

let abrirAtual: ((folhas: FolhaVisor[], indice: number, origem?: HTMLElement, aoFechar?: AoFechar) => void) | null = null;

/** Abre o visualizador com as folhas de um grupo, a partir do elemento tocado (para o voo). */
export function abrirVisualizador(folhas: FolhaVisor[], indice: number, origem?: HTMLElement, aoFechar?: AoFechar) {
  abrirAtual?.(folhas, indice, origem, aoFechar);
}

/** Inclinação acumulada da origem (giro da folha no mural + rotação da folha), em graus. */
function anguloDe(el: HTMLElement): number {
  let soma = 0;
  for (let e: HTMLElement | null = el; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.rotate && cs.rotate !== 'none') soma += parseFloat(cs.rotate);
    if (cs.transform && cs.transform !== 'none') {
      const m = new DOMMatrix(cs.transform);
      soma += (Math.atan2(m.b, m.a) * 180) / Math.PI;
    }
  }
  return soma;
}

export function iniciar(raiz: HTMLElement): Limpeza {
  const achado = raiz.querySelector<HTMLDialogElement>('#visualizador');
  if (!achado) return () => {};
  const visor: HTMLDialogElement = achado;
  const $ = <T extends HTMLElement>(s: string) => visor.querySelector<T>(s)!;
  const fundo = $('[data-fundo]');
  const palco = $('[data-palco]');
  const mesa = $('[data-mesa]');
  const folha = $('[data-folha]');
  const traco = $<HTMLImageElement>('[data-traco]');
  const cor = $<HTMLImageElement>('[data-cor]');
  const proxima = $<HTMLButtonElement>('[data-proxima]');
  const miniaturas = $('[data-miniaturas]');
  const contador = $('[data-contador]');
  const corte = $<HTMLInputElement>('[data-corte]');
  const corteRotulo = $('[data-corte-rotulo]');
  const lupa = $('[data-lupa]');
  const controles = Array.from(visor.querySelectorAll<HTMLElement>('[data-controle]'));

  let folhas: FolhaVisor[] = [];
  let atual = 0;
  let origem: HTMLElement | null = null;

  function aplicarCorte() {
    folha.style.setProperty('--corte', `${corte.value}%`);
    folha.dataset.corte = corte.value;
  }

  function mostrar() {
    const f = folhas[atual];
    const n = folhas.length;
    contador.textContent = n > 1 ? `Folha ${atual + 1} de ${n}` : '';
    mesa.style.setProperty('--ar', `${f.largura} / ${f.altura}`);
    traco.src = f.src;
    cor.src = f.src;
    cor.alt = f.alt;
    // traço ↔ cor só faz sentido em folha colorida
    traco.hidden = !f.colorido;
    corteRotulo.hidden = !f.colorido;
    corte.value = '100';
    aplicarCorte();
    proxima.hidden = n < 2;
    if (n > 1) proxima.querySelector('img')!.src = folhas[(atual + 1) % n].src;
    miniaturas.hidden = n < 2;
    miniaturas.replaceChildren(
      ...(n < 2
        ? []
        : folhas.map((g, j) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', `Folha ${j + 1}`);
            b.setAttribute('aria-current', String(j === atual));
            const img = document.createElement('img');
            img.src = g.mini;
            img.alt = '';
            b.append(img);
            return b;
          })),
    );
  }

  /** Transformação que põe a folha do visor por cima da origem (para o voo de ida e de volta). */
  function sobreAOrigem(el: HTMLElement) {
    const de = el.getBoundingClientRect();
    const para = folha.getBoundingClientRect();
    const dx = de.left + de.width / 2 - (para.left + para.width / 2);
    const dy = de.top + de.height / 2 - (para.top + para.height / 2);
    return `translate(${dx}px, ${dy}px) rotate(${anguloDe(el)}deg) scale(${de.width / para.width}, ${de.height / para.height})`;
  }

  let fechando = false;
  /** Número da troca de folha mais recente (uma troca antiga que termina de esperar é ignorada). */
  let troca = 0;
  /** Número da abertura mais recente (dois toques rápidos: só a última abre). */
  let abertura = 0;
  /** Folha que estava no mural (a origem do voo); o voo de volta só faz sentido com ela na tela. */
  let indiceDaOrigem = 0;
  let avisarAoFechar: AoFechar | undefined;

  async function abrir(lista: FolhaVisor[], indice: number, el?: HTMLElement, aoFechar?: AoFechar) {
    if (visor.open || fechando) return;
    const minha = ++abertura;
    // já baixa e decodifica as folhas do grupo: trocar de folha não pisca em branco
    lista.forEach((f) => void carregar(f.src));
    // Só abre quando a folha tocada já pode ser pintada: trocar o src de uma <img> deixa a imagem
    // ANTERIOR na tela até a nova chegar (era a folha antiga aparecendo por um instante).
    await Promise.race([carregar(lista[indice].src), new Promise((r) => setTimeout(r, ESPERA_MAX))]);
    if (minha !== abertura || visor.open) return;
    folhas = lista;
    atual = indice;
    indiceDaOrigem = indice;
    avisarAoFechar = aoFechar;
    origem = el ?? null;
    mostrar();
    visor.showModal();
    if (reduzido() || !origem) return;
    folha.animate(
      [
        { transform: sobreAOrigem(origem), boxShadow: '0 2px 6px #0003' },
        { transform: 'translateY(-2%) rotate(-1.2deg) scale(1.025)', offset: 0.7 },
        { transform: 'none' },
      ],
      { duration: VOO_MS, easing: TRAZER },
    );
    origem.style.visibility = 'hidden'; // a folha "saiu" de onde estava
    fundo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: VOO_MS * 0.6, easing: 'ease-out' });
    controles.forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: VOO_MS * 0.4, delay: VOO_MS * 0.6, fill: 'backwards' }));
  }
  abrirAtual = (lista, indice, el, aoFechar) => void abrir(lista, indice, el, aoFechar);

  async function fechar() {
    if (fechando || !visor.open) return;
    fechando = true;
    troca++; // cancela uma troca de folha que ainda esperava a imagem
    mesa.querySelectorAll('[data-folha-velha]').forEach((e) => e.remove());
    lupa.classList.remove('ativa');
    // A folha da tela tem de ser a que está na origem: se a pessoa folheou, quem abriu (o mural) põe
    // essa folha no topo da pilha antes do voo, e ela pousa no lugar certo, sem trocar de imagem.
    const mesmaFolha = atual === indiceDaOrigem || (avisarAoFechar?.(atual) ?? false);
    if (!reduzido() && origem && origem.isConnected) {
      controles.forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: VOO_MS * 0.3, fill: 'forwards' }));
      fundo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: VOO_MS * 0.7, delay: VOO_MS * 0.25, fill: 'forwards' });
      // Sem como pôr a folha na origem (fichas do desenho ao vivo), ela esmaece em vez de voar.
      const volta = mesmaFolha
        ? [{ transform: 'none' }, { transform: sobreAOrigem(origem), boxShadow: '0 2px 6px #0003' }]
        : [{ transform: 'none', opacity: 1 }, { transform: 'scale(.96)', opacity: 0 }];
      await folha.animate(volta, { duration: VOO_MS, easing: GUARDAR, fill: 'forwards' }).finished.catch(() => {});
    }
    if (origem) origem.style.visibility = '';
    visor.close();
    [folha, fundo, ...controles].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
    // esvazia o visualizador: a próxima abertura nunca mostra a folha deste grupo
    [traco, cor, proxima.querySelector('img')!].forEach((img) => img.removeAttribute('src'));
    miniaturas.replaceChildren();
    fechando = false;
  }

  async function irPara(destino: number, sentido?: 1 | -1) {
    const n = folhas.length;
    const j = (destino + n) % n;
    if (j === atual || n < 2) return;
    const dir = sentido ?? (j > atual ? 1 : -1);
    lupa.classList.remove('ativa');
    // só troca quando a imagem nova já pode ser pintada (senão a folha pisca em branco)
    const minha = ++troca;
    await Promise.race([carregar(folhas[j].src), new Promise((r) => setTimeout(r, ESPERA_MAX))]);
    if (minha !== troca || !visor.open) return;
    if (reduzido()) {
      atual = j;
      mostrar();
      return;
    }
    // Baralho: as folhas são cartas de um monte, com a próxima espiando torta atrás.
    // Avançando: a carta de cima é puxada para a esquerda e desliza para baixo do monte; a que espiava
    // vem para a frente endireitando aos poucos, a partir da MESMA pose torta (nada de ficar reta do
    // nada); a seguinte já está espiando no lugar dela (a "próxima" troca de imagem escondida por baixo).
    // Voltando: a carta de baixo do monte sai pela esquerda e pousa por cima; a atual vai para a pose de
    // espiar, exatamente onde a "próxima" mostra a mesma folha.
    // A carta que sai é uma cópia só visual (com o tamanho de agora: não estica se a proporção mudar).
    // Tudo opaco o tempo todo.
    mesa.querySelectorAll('[data-folha-velha]').forEach((e) => e.remove());
    const poseAntes = poseDaProxima(); // de onde a carta que espiava sai (inclusive com o mouse em cima)
    const antes = folha.getBoundingClientRect();
    const velha = folha.cloneNode(true) as HTMLElement;
    velha.setAttribute('aria-hidden', 'true');
    velha.dataset.folhaVelha = '';
    delete velha.dataset.folha;
    velha.querySelectorAll<HTMLElement>('[data-traco], [data-cor]').forEach((e) => {
      delete e.dataset.traco;
      delete e.dataset.cor;
    });
    atual = j;
    mostrar();
    const mesaAgora = mesa.getBoundingClientRect();
    Object.assign(velha.style, {
      inset: 'auto',
      left: `${antes.left - mesaAgora.left}px`,
      top: `${antes.top - mesaAgora.top}px`,
      width: `${antes.width}px`,
      height: `${antes.height}px`,
    });
    mesa.append(velha);
    const tempo = { duration: TROCA_MS, fill: 'forwards' as const };
    if (dir > 0) {
      // a de cima (por cima de tudo) sai pela esquerda, e no meio do caminho passa para baixo do monte
      void velha
        .animate(
          [
            { transform: 'none', zIndex: 4, easing: PUXAR },
            { transform: FORA, zIndex: 4, offset: 0.45 },
            { transform: FORA, zIndex: 0, offset: 0.45, easing: GUARDAR },
            { transform: NO_MONTE, zIndex: 0 },
          ],
          tempo,
        )
        .finished.catch(() => {})
        .then(() => velha.remove());
      // a que espiava começa exatamente torta como estava e vem para a frente devagar
      folha.animate(
        [
          { transform: poseAntes, offset: 0 },
          { transform: poseAntes, offset: 0.12, easing: TRAZER },
          { transform: 'none', offset: 1 },
        ],
        { duration: TROCA_MS },
      );
    } else {
      // a carta de baixo do monte sai pela esquerda e, no meio do caminho, passa para cima de tudo
      folha.animate(
        [
          { transform: NO_MONTE, zIndex: 0, easing: PUXAR },
          { transform: FORA, zIndex: 0, offset: 0.45 },
          { transform: FORA, zIndex: 4, offset: 0.45, easing: GUARDAR },
          { transform: 'none', zIndex: 4 },
        ],
        { duration: TROCA_MS },
      );
      // a atual vai para a pose de espiar (onde a "próxima" agora mostra esta mesma folha)
      const poseDepois = poseDaProxima();
      void velha
        .animate(
          [
            { transform: 'none', zIndex: 2, offset: 0 },
            { transform: 'none', zIndex: 2, offset: 0.2, easing: TRAZER },
            { transform: poseDepois, zIndex: 2, offset: 1 },
          ],
          tempo,
        )
        .finished.catch(() => {})
        .then(() => velha.remove());
    }
  }

  /** Transformação atual da carta que espia atrás (a mesma caixa da folha), para as cartas partirem/chegarem nela. */
  function poseDaProxima(): string {
    const t = getComputedStyle(proxima).transform;
    return t && t !== 'none' ? t : 'translateX(17%) rotate(3.5deg) scale(.94)';
  }

  // Lupa: com mouse, segue o ponteiro; no toque, liga ao segurar o dedo parado (arrastar troca de folha).
  function moverLupa(x: number, y: number, alvo: EventTarget | null) {
    const r = folha.getBoundingClientRect();
    const px = x - r.left;
    const py = y - r.top;
    if (px < 0 || py < 0 || px > r.width || py > r.height || (alvo as HTMLElement | null)?.closest?.('[data-proxima]')) {
      lupa.classList.remove('ativa');
      return;
    }
    const pr = palco.getBoundingClientRect();
    const raio = lupa.offsetWidth / 2 || 110;
    lupa.classList.add('ativa');
    lupa.style.left = `${x - pr.left}px`;
    lupa.style.top = `${y - pr.top}px`;
    lupa.style.backgroundImage = `url("${folhas[atual].src}")`;
    lupa.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
    lupa.style.backgroundPosition = `${-(px * ZOOM - raio)}px ${-(py * ZOOM - raio)}px`;
    lupa.style.filter = (px / r.width) * 100 > Number(corte.value) ? 'grayscale(1) contrast(1.6) brightness(1.08)' : 'none';
  }
  let toque: { x: number; y: number; lupa: boolean; arrastou: boolean; timer: number; ultimo: PointerEvent } | null = null;

  const limpezas: Limpeza[] = [
    ouvir(proxima, 'click', () => void irPara(atual + 1, 1)),
    ouvir(miniaturas, 'click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      const j = b ? Array.from(miniaturas.children).indexOf(b) : -1;
      if (j >= 0) void irPara(j);
    }),
    ouvir(visor.querySelector<HTMLElement>('[data-fechar]')!, 'click', () => void fechar()),
    ouvir(visor, 'cancel', (e) => {
      e.preventDefault(); // Esc também usa o voo de volta
      void fechar();
    }),
    ouvir(corte, 'input', aplicarCorte),
    // fora da folha e dos botões, um clique fecha (no toque, não: o dedo pode estar arrastando)
    ouvir(palco, 'click', (e) => {
      if (e.target === palco && (e as PointerEvent).pointerType !== 'touch') void fechar();
    }),
    ouvir(document, 'keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (!visor.open || (ev.target as HTMLElement).matches?.('input')) return;
      if (ev.key === 'ArrowRight') void irPara(atual + 1, 1);
      if (ev.key === 'ArrowLeft') void irPara(atual - 1, -1);
    }),
    ouvir(palco, 'pointerdown', (e) => {
      const ev = e as PointerEvent;
      if (ev.pointerType === 'mouse' || (ev.target as HTMLElement).closest('[data-proxima]')) return;
      const t = { x: ev.clientX, y: ev.clientY, lupa: false, arrastou: false, ultimo: ev, timer: 0 };
      t.timer = window.setTimeout(() => {
        if (toque === t && !t.arrastou) {
          t.lupa = true;
          moverLupa(t.ultimo.clientX, t.ultimo.clientY, t.ultimo.target);
        }
      }, 280);
      toque = t;
    }),
    ouvir(palco, 'pointermove', (e) => {
      const ev = e as PointerEvent;
      if (ev.pointerType === 'mouse') return moverLupa(ev.clientX, ev.clientY, ev.target);
      if (!toque) return;
      toque.ultimo = ev;
      if (toque.lupa) return moverLupa(ev.clientX, ev.clientY, ev.target);
      if (Math.hypot(ev.clientX - toque.x, ev.clientY - toque.y) > 10) {
        toque.arrastou = true;
        clearTimeout(toque.timer);
      }
    }),
    ouvir(palco, 'pointerup', (e) => {
      const ev = e as PointerEvent;
      if (!toque) return;
      clearTimeout(toque.timer);
      const dx = ev.clientX - toque.x;
      const dy = ev.clientY - toque.y;
      if (!toque.lupa && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) void irPara(atual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      toque = null;
      lupa.classList.remove('ativa');
    }),
    ouvir(palco, 'pointercancel', () => {
      if (toque) clearTimeout(toque.timer);
      toque = null;
      lupa.classList.remove('ativa');
    }),
    ouvir(palco, 'pointerleave', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') lupa.classList.remove('ativa');
    }),
  ];

  return () => {
    limpezas.forEach((f) => f());
    if (visor.open) visor.close();
    if (origem) origem.style.visibility = '';
    abrirAtual = null;
  };
}
