import { lerFolhas, ouvir, type Limpeza } from './comum';
import { abrirVisualizador } from './visualizador';

/**
 * Mural de desenhos à mão (o antigo varal): tocar numa folha abre o grupo no visualizador.
 * As folhas ficam paradas e já aparecem com a cor (sem efeito de grafite ao rolar).
 */
export function iniciar(raiz: HTMLElement): Limpeza {
  const mural = raiz.querySelector<HTMLElement>('[data-varal]');
  if (!mural) return () => {};
  const grupos = Array.from(mural.querySelectorAll<HTMLElement>('[data-grupo]'));

  // Pilha de cada grupo: as imagens do mural na ordem original (folha 0 no topo, depois as de trás).
  // Quando a pessoa fecha o visualizador em outra folha, essa folha passa a ser a do topo.
  const pilhas = new Map(
    grupos.map((g) => [g, Array.from(g.querySelectorAll<HTMLImageElement>('.folha img'), (img) => img.src)]),
  );
  function porNoTopo(g: HTMLElement, t: number) {
    const srcs = pilhas.get(g)!;
    const n = srcs.length;
    const topo = g.querySelector<HTMLImageElement>('.folha--topo img')!;
    topo.src = srcs[t];
    topo.alt = lerFolhas(g)[t]?.alt ?? '';
    // as de trás seguem a ordem do grupo a partir da que ficou no topo
    g.querySelectorAll<HTMLImageElement>('.folha:not(.folha--topo) img').forEach((img, k) => (img.src = srcs[(t + k + 1) % n]));
    g.dataset.topo = String(t);
  }
  // a folha de cima sai do mural enquanto está aberta; abre na folha do topo
  const abrir = (g: HTMLElement) =>
    abrirVisualizador(lerFolhas(g), Number(g.dataset.topo ?? 0), g.querySelector<HTMLElement>('.folha--topo') ?? g, (indice) => {
      porNoTopo(g, indice);
      return true;
    });

  const aoTocar = ouvir(mural, 'click', (e) => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('[data-grupo]');
    if (g) abrir(g);
  });
  return () => {
    aoTocar();
    grupos.forEach((g) => {
      if (g.dataset.topo) porNoTopo(g, 0);
      delete g.dataset.topo;
    });
  };
}
