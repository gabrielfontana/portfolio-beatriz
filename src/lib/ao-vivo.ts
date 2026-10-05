// Sem imports: também é importado direto pelo Node no scripts/gerar-croquis.mjs.
// "Desenho ao vivo": a folha aparece primeiro a lápis e depois o marcador colore em pinceladas.
// O script gera, a partir do original, uma camada de lápis e um mapa de tempo (quando cada pixel aparece);
// o navegador só mistura as camadas conforme o avanço (pintarQuadro).

export const TELA_AO_VIVO = { largura: 700, altura: 990 };

/**
 * Lápis a partir do desenho colorido ("color dodge"): áreas chapadas viram papel e as bordas viram traço.
 * `cinza` e `invertidoBorrado` têm 1 canal; o segundo é (255 - cinza) com desfoque.
 */
export function camadaLapis(cinza: Uint8Array, invertidoBorrado: Uint8Array): Uint8Array {
  const saida = new Uint8Array(cinza.length);
  for (let i = 0; i < cinza.length; i++) {
    const clareado = Math.min(255, (cinza[i] * 255) / Math.max(1, 255 - invertidoBorrado[i]));
    saida[i] = Math.round(255 * Math.pow(clareado / 255, 3.2));
  }
  return saida;
}

/** Ruído suave (interpolação bilinear numa grade aleatória com semente), em [0, 1). */
function criarRuido(semente: number, gx: number, gy: number) {
  let s = semente;
  const aleatorio = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const grade = Array.from({ length: (gx + 1) * (gy + 1) }, aleatorio);
  return (x: number, y: number) => {
    const fx = x * gx;
    const fy = y * gy;
    const ix = Math.min(gx - 1, Math.floor(fx));
    const iy = Math.min(gy - 1, Math.floor(fy));
    const tx = fx - ix;
    const ty = fy - iy;
    const g = (i: number, j: number) => grade[j * (gx + 1) + i];
    const cima = g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx;
    const baixo = g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx;
    return cima * (1 - ty) + baixo * ty;
  };
}

/** Pixel de papel (claro e pouco saturado): muda junto e só no fim, para o papel não ficar listrado. */
export function ehPapel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  return max > 195 && max - Math.min(r, g, b) < 30;
}

/**
 * Mapa de tempo, RGB: R = quando o lápis passa (de cima para baixo, borda irregular);
 * G = quando o marcador colore (pinceladas diagonais com início desencontrado). 0 = primeiro, 255 = último.
 */
export function mapaDeTempo(rgb: Uint8Array, largura: number, altura: number, semente = 7): Uint8Array {
  const ruidoLapis = criarRuido(semente, 6, 9);
  const ruidoCor = criarRuido(semente + 92, 5, 7);
  const angulo = (-35 * Math.PI) / 180;
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  const larguraPincel = 30 * (largura / TELA_AO_VIVO.largura);
  // extensão das coordenadas giradas
  const cantos = [[0, 0], [largura, 0], [0, altura], [largura, altura]];
  const us = cantos.map(([x, y]) => x * cos + y * sin);
  const vs = cantos.map(([x, y]) => -x * sin + y * cos);
  const uMin = Math.min(...us);
  const vMin = Math.min(...vs);
  const vSpan = Math.max(...vs) - vMin;
  const pinceladas = Math.ceil((Math.max(...us) - uMin) / larguraPincel);
  let s = semente * 31 + 1;
  const atraso = Array.from({ length: pinceladas + 1 }, () => ((s = (s * 16807) % 2147483647) / 2147483647) * 1.6 - 0.8);

  const saida = new Uint8Array(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const xn = x / largura;
      const yn = y / altura;
      const tLapis = Math.min(1, Math.max(0, 0.8 * yn + 0.2 * ruidoLapis(xn, yn)));
      const u = x * cos + y * sin - uMin;
      const v = (-x * sin + y * cos - vMin) / vSpan;
      const k = Math.floor(u / larguraPincel);
      const tCor = ehPapel(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])
        ? 0.86 + 0.14 * ruidoCor(xn, yn)
        : Math.min(0.85, Math.max(0, (k + atraso[k] + 2.2 * v + 0.6 * (ruidoCor(xn, yn) - 0.5)) / (pinceladas + 2.2)));
      saida[i * 3] = Math.round(tLapis * 255);
      saida[i * 3 + 1] = Math.round(tCor * 255);
    }
  }
  return saida;
}

/** Largura da borda de transição, na escala 0–255 do mapa. */
const BORDA = 18;

/**
 * Pinta um quadro: papel → lápis conforme `lapis` (0–1) → cor conforme `marcador` (0–1).
 * Todos os buffers são RGBA do mesmo tamanho (como os de ImageData).
 */
export function pintarQuadro(
  saida: Uint8ClampedArray,
  cor: Uint8ClampedArray,
  lapisRgba: Uint8ClampedArray,
  mapa: Uint8ClampedArray,
  lapis: number,
  marcador: number,
): void {
  const limL = lapis * (255 + BORDA);
  const limM = marcador * (255 + BORDA);
  for (let i = 0; i < saida.length; i += 4) {
    let la = (limL - mapa[i]) / BORDA;
    la = la < 0 ? 0 : la > 1 ? 1 : la;
    let ma = (limM - mapa[i + 1]) / BORDA;
    ma = ma < 0 ? 0 : ma > 1 ? 1 : ma;
    for (let c = 0; c < 3; c++) {
      const traco = 255 + (lapisRgba[i + c] - 255) * la;
      saida[i + c] = traco + (cor[i + c] - traco) * ma;
    }
    saida[i + 3] = 255;
  }
}
