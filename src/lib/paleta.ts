// Lógica de cor dos croquis. Sem imports e só com sintaxe TS "apagável":
// o script scripts/gerar-paletas.mjs importa este arquivo direto pelo Node.
export type RGB = [number, number, number];
export type Lab = [number, number, number];

export interface Grupo {
  centro: Lab;
  total: number;
}

export interface CorPaleta {
  hex: string;
  nome: string;
}

const XN = 0.95047;
const ZN = 1.08883;
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const gama = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
const f = (t: number) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const fInv = (t: number) => (t ** 3 > EPS ? t ** 3 : (116 * t - 16) / KAPPA);

export function hexParaRgb(hex: string): RGB {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as RGB;
}

export function rgbParaHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function rgbParaLab([r, g, b]: RGB): Lab {
  const R = linear(r);
  const G = linear(g);
  const B = linear(b);
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN;
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labParaRgb([L, a, b]: Lab): RGB {
  const fy = (L + 16) / 116;
  const x = fInv(fy + a / 500) * XN;
  const y = fInv(fy);
  const z = fInv(fy - b / 200) * ZN;
  return [
    gama(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    gama(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    gama(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
  ];
}

export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function croma([, a, b]: Lab): number {
  return Math.hypot(a, b);
}

export function matiz([, a, b]: Lab): number {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/** Fundo e traço: tudo que é quase sem cor e não é preto (branco, sombra do papel, cinza do contorno). */
export function ehFundo(lab: Lab): boolean {
  return croma(lab) < 10 && lab[0] > 35;
}

/** Tom de pele dos croquis: laranja dessaturado, de médio a claro (HSV). */
export function ehPele([r, g, b]: RGB): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max !== r || max === min) return false;
  const h = ((g - b) / (max - min)) * 60;
  const s = (max - min) / max;
  const v = max / 255;
  return h >= 10 && h <= 35 && s >= 0.15 && s <= 0.56 && v >= 0.5 && v <= 0.95;
}

const distancia2 = (p: Lab, q: Lab) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

/** k-means determinístico: centros iniciais nos quantis de luminosidade. */
export function kmeans(pontos: Lab[], k: number, iteracoes = 20): Grupo[] {
  if (pontos.length === 0) return [];
  const n = Math.min(k, pontos.length);
  const ordenados = [...pontos].sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
  let centros: Lab[] = Array.from({ length: n }, (_, i) => ordenados[Math.floor(((i + 0.5) * ordenados.length) / n)]);
  let totais: number[] = new Array(n).fill(0);
  for (let it = 0; it < iteracoes; it++) {
    const somas = centros.map(() => [0, 0, 0]);
    totais = new Array(n).fill(0);
    for (const p of pontos) {
      let melhor = 0;
      let menor = Infinity;
      for (let i = 0; i < n; i++) {
        const d = distancia2(p, centros[i]);
        if (d < menor) {
          menor = d;
          melhor = i;
        }
      }
      somas[melhor][0] += p[0];
      somas[melhor][1] += p[1];
      somas[melhor][2] += p[2];
      totais[melhor]++;
    }
    const novos = centros.map((c, i): Lab =>
      totais[i] ? [somas[i][0] / totais[i], somas[i][1] / totais[i], somas[i][2] / totais[i]] : c,
    );
    const mudou = novos.some((c, i) => distancia2(c, centros[i]) > 1e-6);
    centros = novos;
    if (!mudou) break;
  }
  return centros.map((centro, i) => ({ centro, total: totais[i] })).sort((a, b) => b.total - a.total);
}

/** Junta grupos com cores quase iguais (ΔE < limite), com média ponderada. */
export function fundirParecidos(grupos: Grupo[], limite = 12): Grupo[] {
  const resultado: Grupo[] = [];
  for (const g of [...grupos].sort((a, b) => b.total - a.total)) {
    if (g.total === 0) continue;
    const alvo = resultado.find((r) => deltaE(r.centro, g.centro) < limite);
    if (alvo) {
      const total = alvo.total + g.total;
      alvo.centro = alvo.centro.map((v, i) => (v * alvo.total + g.centro[i] * g.total) / total) as Lab;
      alvo.total = total;
    } else {
      resultado.push({ centro: [...g.centro] as Lab, total: g.total });
    }
  }
  return resultado.sort((a, b) => b.total - a.total);
}

export function nomearCor(lab: Lab): string {
  const L = lab[0];
  const C = croma(lab);
  const h = matiz(lab);
  if (L < 22 && C < 12) return 'Preto';
  if (C < 10) return L > 85 ? 'Branco' : 'Cinza';
  if (h < 10 || h >= 330) return L < 35 ? 'Vinho' : 'Rosa';
  if (h < 50) return L < 35 ? 'Vinho' : L > 72 ? 'Rosa' : 'Vermelho';
  if (h < 70) return L < 50 ? 'Marrom' : 'Laranja';
  if (h < 105) return L < 55 ? 'Marrom' : 'Amarelo';
  if (h < 200) return 'Verde';
  if (h < 315) return L > 75 ? 'Azul-claro' : L < 30 ? 'Azul-marinho' : 'Azul';
  return 'Roxo';
}

/** Sugere de 3 a 4 cores de roupa a partir dos pixels de um croqui. */
export function sugerirPaleta(pixels: RGB[]): { cores: CorPaleta[]; aviso?: string } {
  const roupa = pixels.filter((p) => !ehPele(p)).map(rgbParaLab).filter((l) => !ehFundo(l));
  if (roupa.length === 0) return { cores: [], aviso: 'nenhuma cor de roupa encontrada; escreva a paleta à mão' };
  // Sombras da mesma cor se fundem; depois, da maior área para a menor, só entra
  // uma cor bem diferente das já escolhidas, para os acessórios pequenos aparecerem.
  const grupos = fundirParecidos(kmeans(roupa, 10), 20);
  const total = roupa.length;
  const escolhidos: Grupo[] = [];
  for (const g of grupos) {
    if (escolhidos.length === 4 || g.total / total < 0.01) break;
    if (escolhidos.some((e) => deltaE(e.centro, g.centro) < 25)) continue;
    escolhidos.push(g);
  }
  const cores = escolhidos.map((g) => ({ hex: rgbParaHex(labParaRgb(g.centro)), nome: nomearCor(g.centro) }));
  if (cores.length < 3) {
    return { cores, aviso: `só ${cores.length} cor(es) encontrada(s); escreva a paleta à mão` };
  }
  return { cores };
}

/** Pixel faz parte da área de uma cor da paleta (para as máscaras). */
export function pertenceACor(rgb: RGB, alvo: Lab, limite = 18): boolean {
  if (ehPele(rgb)) return false;
  const lab = rgbParaLab(rgb);
  return !ehFundo(lab) && deltaE(lab, alvo) < limite;
}
