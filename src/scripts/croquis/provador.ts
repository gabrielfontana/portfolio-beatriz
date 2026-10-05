import { soltar } from '../destaque-cor';
import { ouvir, reduzido, type Limpeza } from './comum';

const DURACAO = 950;
const CURVA = 'cubic-bezier(.65,0,.35,1)';

/**
 * Provador: cada manequim empilha os looks de uma pose e mostra um por vez. Na troca, a roupa nova cai
 * de cima para baixo com a borda esfumada (máscara em gradiente), uma faixa de brilho acompanha a borda
 * e a nova assenta saindo de um leve desfoque; voltar faz o mesmo de baixo para cima.
 * A cor selecionada do look que sai é solta (só uma cor fica selecionada na página).
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const provador = raiz.querySelector<HTMLElement>('[data-provador]');
  if (!provador) return () => {};
  provador.classList.add('provador--ativo');
  const limpezas = Array.from(provador.querySelectorAll<HTMLElement>('[data-manequim]')).map(montar);
  return () => {
    limpezas.forEach((f) => f());
    provador.classList.remove('provador--ativo');
  };
}

function montar(manequim: HTMLElement): Limpeza {
  const vitrine = manequim.querySelector<HTMLElement>('[data-vitrine]')!;
  const controles = manequim.querySelector<HTMLElement>('[data-so-js]');
  const looks = Array.from(vitrine.querySelectorAll<HTMLElement>('[data-croqui]'));
  const pontos = Array.from(manequim.querySelectorAll<HTMLButtonElement>('[data-ir]'));
  let atual = Math.max(0, looks.findIndex((l) => l.hasAttribute('data-atual')));
  if (controles) controles.hidden = false;

  const marcar = () => {
    looks.forEach((l, i) => {
      l.toggleAttribute('data-atual', i === atual);
      l.inert = i !== atual; // looks guardados não recebem foco nem são lidos
    });
    pontos.forEach((p, i) => p.setAttribute('aria-current', String(i === atual)));
  };
  marcar();

  // Encerra na hora a troca em andamento (cliques rápidos não empilham animações).
  let encerrar: (() => void) | null = null;

  function ir(destino: number, sentido?: 1 | -1) {
    const i = (destino + looks.length) % looks.length;
    if (i === atual) return;
    const dir = sentido ?? (i > atual ? 1 : -1);
    encerrar?.();
    const velho = looks[atual];
    const novo = looks[i];
    soltar(velho);
    atual = i;
    marcar();
    if (reduzido()) return;

    const palcoNovo = novo.querySelector<HTMLElement>('.croqui__palco')!;
    const palcoVelho = velho.querySelector<HTMLElement>('.croqui__palco')!;
    velho.setAttribute('data-saindo', '');
    palcoNovo.classList.add(dir > 0 ? 'caindo' : 'subindo');
    const altura = palcoNovo.offsetHeight;
    // A borda da máscara vai de -0,5 a 1,5 altura (ou o contrário); o brilho anda junto com ela.
    const [mDe, mPara] = dir > 0 ? ['0 100%', '0 0'] : ['0 0', '0 100%'];
    const [bDe, bPara] = dir > 0 ? [-0.5 * altura, 1.5 * altura] : [1.5 * altura, -0.5 * altura];
    const faixa = altura * 0.3;
    // O brilho fica numa caixa do tamanho do palco, por cima dele, recortando o que passa das bordas.
    const caixa = document.createElement('div');
    caixa.className = 'provador__brilho';
    Object.assign(caixa.style, {
      top: `${palcoNovo.offsetTop}px`,
      left: `${palcoNovo.offsetLeft}px`,
      width: `${palcoNovo.offsetWidth}px`,
      height: `${altura}px`,
    });
    const faixaEl = document.createElement('div');
    faixaEl.style.height = `${faixa}px`;
    caixa.append(faixaEl);
    manequim.append(caixa);

    const animacoes = [
      palcoNovo.animate(
        [
          { maskPosition: mDe, WebkitMaskPosition: mDe, filter: 'blur(3px)', transform: 'scale(1.025)' },
          { maskPosition: mPara, WebkitMaskPosition: mPara, filter: 'blur(0)', transform: 'scale(1)' },
        ] as Keyframe[],
        { duration: DURACAO, easing: CURVA },
      ),
      palcoVelho.animate([{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(2px)', opacity: 0.7 }], { duration: DURACAO, easing: CURVA }),
      faixaEl.animate(
        [{ transform: `translateY(${bDe - faixa / 2}px)` }, { transform: `translateY(${bPara - faixa / 2}px)` }],
        { duration: DURACAO, easing: CURVA },
      ),
    ];
    const fim = () => {
      animacoes.forEach((a) => a.cancel());
      palcoNovo.classList.remove('caindo', 'subindo');
      velho.removeAttribute('data-saindo');
      caixa.remove();
      if (encerrar === fim) encerrar = null;
    };
    encerrar = fim;
    animacoes[0].finished.then(fim, () => {});
  }

  const limpezas: Limpeza[] = [
    ouvir(manequim.querySelector<HTMLElement>('[data-proximo]')!, 'click', () => ir(atual + 1, 1)),
    ouvir(manequim.querySelector<HTMLElement>('[data-anterior]')!, 'click', () => ir(atual - 1, -1)),
    ...pontos.map((p, i) => ouvir(p, 'click', () => ir(i))),
    ouvir(manequim, 'keydown', (e) => {
      const tecla = (e as KeyboardEvent).key;
      if (tecla === 'ArrowRight') ir(atual + 1, 1);
      if (tecla === 'ArrowLeft') ir(atual - 1, -1);
    }),
  ];

  // Na figura: toque troca para o próximo; arrastar para o lado vai para o próximo ou o anterior.
  let inicio: { x: number; y: number } | null = null;
  limpezas.push(
    ouvir(vitrine, 'pointerdown', (e) => {
      const ev = e as PointerEvent;
      if (!(ev.target as HTMLElement).closest('.croqui__palco')) return;
      inicio = { x: ev.clientX, y: ev.clientY };
    }),
    ouvir(vitrine, 'pointerup', (e) => {
      const ev = e as PointerEvent;
      if (!inicio) return;
      const dx = ev.clientX - inicio.x;
      const dy = ev.clientY - inicio.y;
      inicio = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) ir(atual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else if (Math.hypot(dx, dy) < 8) ir(atual + 1, 1);
    }),
    ouvir(vitrine, 'pointercancel', () => (inicio = null)),
  );

  return () => {
    encerrar?.();
    limpezas.forEach((f) => f());
    if (controles) controles.hidden = true;
    looks.forEach((l) => (l.inert = false));
  };
}
