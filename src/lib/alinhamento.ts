// Sem imports: também é importado direto pelo Node no scripts/gerar-croquis.mjs.
// Alinha os croquis do Sketchbook num quadro comum, para a roupa trocar "no mesmo corpo" no provador:
// a figura (já recortada do branco em volta) é escalada para a mesma altura e centralizada pela cabeça.

export const QUADRO = { largura: 1000, altura: 1500, alturaFigura: 1400, margem: 50 };

/** Fração do topo da figura usada para achar a cabeça. */
export const FAIXA_CABECA = 0.07;

/**
 * Centro horizontal da cabeça: média das colunas dos pixels escuros (cinza < limiar)
 * nas primeiras linhas da figura. `cinza` tem 1 canal, linha a linha.
 */
export function centroDaCabeca(cinza: Uint8Array, largura: number, linhas: number, limiar = 160): number {
  let soma = 0;
  let quantos = 0;
  for (let y = 0; y < linhas; y++) {
    for (let x = 0; x < largura; x++) {
      if (cinza[y * largura + x] < limiar) {
        soma += x;
        quantos++;
      }
    }
  }
  return quantos ? soma / quantos : largura / 2;
}

export interface Enquadramento {
  /** Coluna do quadro onde a figura começa (≥ 0). */
  esquerda: number;
  /** Colunas da figura cortadas à esquerda (quando ela passa da borda). */
  recorteX: number;
  /** Largura da figura que cabe no quadro. */
  larguraVisivel: number;
}

/** Posição da figura no quadro para a cabeça cair no centro; o que passar das bordas é cortado. */
export function enquadrar(larguraFigura: number, centroCabeca: number, larguraQuadro = QUADRO.largura): Enquadramento {
  const inicio = Math.round(larguraQuadro / 2 - centroCabeca);
  const recorteX = Math.max(0, -inicio);
  const esquerda = Math.max(0, inicio);
  const larguraVisivel = Math.max(1, Math.min(larguraFigura - recorteX, larguraQuadro - esquerda));
  return { esquerda, recorteX, larguraVisivel };
}
