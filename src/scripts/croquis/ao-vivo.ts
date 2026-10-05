import { pintarQuadro, TELA_AO_VIVO } from '../../lib/ao-vivo';
import { limitar, lerFolhas, ouvir, reduzido, type Limpeza } from './comum';
import { abrirVisualizador } from './visualizador';

const DURACAO = 2000;
const DURACAO_FICHA = 600;
const ATRASO_FICHA = 110;

const suave = (t: number) => t * t * (3 - 2 * t);
const fase = (p: number, a: number, b: number) => limitar((p - a) / (b - a));

function pixels(src: string): Promise<Uint8ClampedArray> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = TELA_AO_VIVO.largura;
      c.height = TELA_AO_VIVO.altura;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      ok(ctx.getImageData(0, 0, c.width, c.height).data);
    };
    img.onerror = erro;
    img.src = src;
  });
}

/**
 * Desenho ao vivo. Dois gatilhos independentes, cada um uma vez só:
 * - fichas técnicas: entram assim que a seção começa a aparecer (quem rola rápido também vê);
 * - desenho: com a folha razoavelmente visível, o lápis desce e o marcador colore (~2 s).
 * Depois de pronto, fica pronto (a imagem final, com marca d'água, volta para o lugar do canvas).
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const figuras = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ao-vivo]'));
  if (figuras.length === 0) return () => {};
  const limpezas: Limpeza[] = figuras.map((fig) =>
    ouvir(fig, 'click', (e) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-abrir]');
      if (alvo) abrirVisualizador(lerFolhas(fig), Number(alvo.dataset.abrir), alvo);
    }),
  );
  if (reduzido()) return () => limpezas.forEach((f) => f());

  const celular = window.matchMedia('(max-width: 767px)').matches;
  const fora = celular ? 'translateY(45vh)' : 'translateX(70vw)';
  const estados = figuras.map((fig) => {
    const canvas = fig.querySelector<HTMLCanvasElement>('canvas')!;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fig.classList.add('ao-vivo--preparado');
    const fichas = Array.from(fig.querySelectorAll<HTMLElement>('.ao-vivo__ficha'));
    fichas.forEach((f) => {
      f.style.transform = fora;
      f.style.opacity = '0';
    });
    return { fig, ctx, fichas, inicio: null as number | null, dados: null as null | { cor: Uint8ClampedArray; lapis: Uint8ClampedArray; mapa: Uint8ClampedArray; saida: ImageData }, pronto: false };
  });

  let raf = 0;
  function quadro() {
    raf = 0;
    const agora = performance.now();
    let continuar = false;
    for (const e of estados) {
      if (e.inicio == null || e.pronto) continue;
      if (!e.dados) {
        continuar = true; // camadas ainda carregando
        continue;
      }
      const p = limitar((agora - e.inicio) / DURACAO);
      pintarQuadro(e.dados.saida.data, e.dados.cor, e.dados.lapis, e.dados.mapa, suave(fase(p, 0, 0.45)), fase(p, 0.35, 1));
      e.ctx.putImageData(e.dados.saida, 0, 0);
      if (p < 1) continuar = true;
      else {
        e.pronto = true;
        e.fig.classList.remove('ao-vivo--preparado'); // a imagem final (igual ao último quadro) volta
        e.fig.dataset.desenhado = '';
      }
    }
    if (continuar) raf = requestAnimationFrame(quadro);
  }

  const vigiaFichas = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((ent) => {
        if (!ent.isIntersecting) return;
        vigiaFichas.unobserve(ent.target);
        const e = estados.find((s) => s.fig === ent.target)!;
        e.fichas.forEach((f, i) => {
          f.animate([{ transform: fora, opacity: 0 }, { transform: 'none', opacity: 1 }], {
            duration: DURACAO_FICHA,
            delay: i * ATRASO_FICHA,
            easing: 'cubic-bezier(.2,.8,.2,1)',
            fill: 'backwards',
          });
          f.style.transform = '';
          f.style.opacity = '';
        });
      }),
    { threshold: 0.12 },
  );
  const vigiaDesenho = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((ent) => {
        if (!ent.isIntersecting) return;
        vigiaDesenho.unobserve(ent.target);
        const e = estados.find((s) => s.fig === ent.target)!;
        const { cor, lapis, tempo } = e.fig.dataset;
        Promise.all([pixels(cor!), pixels(lapis!), pixels(tempo!)])
          .then(([c, l, m]) => {
            e.dados = { cor: c, lapis: l, mapa: m, saida: e.ctx.createImageData(TELA_AO_VIVO.largura, TELA_AO_VIVO.altura) };
            e.inicio = performance.now();
            if (!raf) raf = requestAnimationFrame(quadro);
          })
          .catch(() => {
            // sem as camadas, mostra o desenho pronto
            e.pronto = true;
            e.fig.classList.remove('ao-vivo--preparado');
          });
        if (!raf) raf = requestAnimationFrame(quadro);
      }),
    { threshold: 0.35 },
  );
  estados.forEach((e) => {
    vigiaFichas.observe(e.fig);
    vigiaDesenho.observe(e.fig);
  });

  return () => {
    limpezas.forEach((f) => f());
    vigiaFichas.disconnect();
    vigiaDesenho.disconnect();
    cancelAnimationFrame(raf);
    estados.forEach((e) => {
      e.fig.classList.remove('ao-vivo--preparado');
      e.fichas.forEach((f) => {
        f.getAnimations().forEach((a) => a.cancel());
        f.style.transform = '';
        f.style.opacity = '';
      });
    });
  };
}
