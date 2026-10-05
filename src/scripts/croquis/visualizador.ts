import { ouvir, reduzido, type FolhaVisor, type Limpeza } from './comum';

const CURVA = 'cubic-bezier(.2,.8,.2,1)';
const ESPIANDO = 'translateX(17%) rotate(3.5deg) scale(.94)';
const SAINDO = 'translateX(-70%) rotate(-7deg)';
const ZOOM = 2.6;

let abrirAtual: ((folhas: FolhaVisor[], indice: number, origem?: HTMLElement) => void) | null = null;

/** Abre o visualizador com as folhas de um grupo, a partir do elemento tocado (para o voo). */
export function abrirVisualizador(folhas: FolhaVisor[], indice: number, origem?: HTMLElement) {
  abrirAtual?.(folhas, indice, origem);
}

/** Inclinação acumulada da origem (balanço do varal + rotação da folha), em graus. */
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

  function abrir(lista: FolhaVisor[], indice: number, el?: HTMLElement) {
    folhas = lista;
    atual = indice;
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
      { duration: 680, easing: CURVA },
    );
    origem.style.visibility = 'hidden'; // a folha "saiu" de onde estava
    fundo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    controles.forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 380, fill: 'backwards' }));
  }
  abrirAtual = abrir;

  let fechando = false;
  async function fechar() {
    if (fechando || !visor.open) return;
    fechando = true;
    lupa.classList.remove('ativa');
    if (!reduzido() && origem && origem.isConnected) {
      controles.forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }));
      fundo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 80, fill: 'forwards' });
      await folha
        .animate([{ transform: 'none' }, { transform: sobreAOrigem(origem), boxShadow: '0 2px 6px #0003' }], {
          duration: 520,
          easing: 'cubic-bezier(.5,0,.3,1)',
          fill: 'forwards',
        })
        .finished.catch(() => {});
    }
    if (origem) origem.style.visibility = '';
    visor.close();
    [folha, fundo, ...controles].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
    fechando = false;
  }

  function irPara(destino: number, sentido?: 1 | -1) {
    const n = folhas.length;
    const j = (destino + n) % n;
    if (j === atual || n < 2) return;
    const dir = sentido ?? (j > atual ? 1 : -1);
    lupa.classList.remove('ativa');
    if (!reduzido()) {
      // a folha atual sai (para a esquerda, ou para trás ao voltar) e a outra entra
      // cópia só visual da folha atual (os elementos de verdade já foram guardados no início)
      const velha = folha.cloneNode(true) as HTMLElement;
      velha.setAttribute('aria-hidden', 'true');
      delete velha.dataset.folha;
      velha.querySelectorAll<HTMLElement>('[data-traco], [data-cor]').forEach((e) => {
        delete e.dataset.traco;
        delete e.dataset.cor;
      });
      velha.style.zIndex = dir > 0 ? '3' : '1';
      mesa.append(velha);
      velha
        .animate([{ transform: 'none', opacity: 1 }, { transform: dir > 0 ? SAINDO : ESPIANDO, opacity: 0 }], {
          duration: 380,
          easing: 'cubic-bezier(.4,0,.6,1)',
          fill: 'forwards',
        })
        .finished.then(() => velha.remove(), () => velha.remove());
      folha.animate(
        [{ transform: dir > 0 ? ESPIANDO : SAINDO, opacity: dir > 0 ? 1 : 0 }, { transform: 'none', opacity: 1 }],
        { duration: 460, easing: CURVA },
      );
    }
    atual = j;
    mostrar();
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
    ouvir(proxima, 'click', () => irPara(atual + 1, 1)),
    ouvir(miniaturas, 'click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      const j = b ? Array.from(miniaturas.children).indexOf(b) : -1;
      if (j >= 0) irPara(j);
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
      if (ev.key === 'ArrowRight') irPara(atual + 1, 1);
      if (ev.key === 'ArrowLeft') irPara(atual - 1, -1);
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
      if (!toque.lupa && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) irPara(atual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
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
