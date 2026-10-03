# Croquis com Paletas Interativas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar os 9 croquis reais da Beatriz numa página `/croquis` em formato de prancha de coleção. Cada croqui tem uma paleta de 3–4 cores, gerada por script e corrigível à mão. Tocar numa cor destaca no desenho as áreas daquela cor. A fila de croquis "desfila" com a rolagem.

**Architecture:**
- A lógica de cor (Lab, filtros de fundo e pele, k-means, nomes) fica pura em `src/lib/paleta.ts`, com testes.
- O script `scripts/gerar-paletas.mjs` (Node 24 importa `.ts` direto):
  - grava a paleta sugerida no `index.md` de cada look só quando ela não existe;
  - gera uma máscara PNG por cor.
- A página resolve as máscaras com `import.meta.glob` e faz o destaque em CSS (`mask-image`).
- O desfile é um módulo GSAP no padrão existente: pin horizontal no desktop e carrossel `scroll-snap` no celular. Sem JS ou com movimento reduzido, tudo vira uma grade.

**Tech Stack:** Astro 5.18.2, GSAP 3.15 + ScrollTrigger, sharp, yaml 2, Vitest 3.2, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-02-croquis-paletas-design.md`

## Global Constraints

- Branch `feat/portfolio-v1`. Astro continua fixo em `5.18.2`.
- O script de paletas exige Node ≥ 22.18, por causa do import direto de `.ts` (a máquina tem Node 24).
- Idioma: português. Nomes dos looks: "Look 01" a "Look 09".
- Paleta: 3 a 4 cores `{ hex: "#rrggbb", nome }`. O script grava hex em minúsculas e entre aspas.
- O script **nunca altera** uma paleta já escrita no `index.md`. Máscaras são sempre regeneradas a partir da paleta atual.
- Nome da máscara: `mascara-<hex sem # em minúsculas>.png`, na pasta do look.
- Tokens de cor do site: papel `#f6efe4`, tinta `#141414`, `--vermelho-texto` `#c00000` para texto pequeno. Breakpoint `768px`.
- Sem JS ou com `prefers-reduced-motion: reduce`: grade estática, nada escondido.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Heredocs no Git Bash engolem `\\`. Arquivos com barra invertida devem ser escritos com a ferramenta Write.

### Desvios conscientes da spec
- As máscaras são geradas com no máximo **600px de largura**, não no tamanho original. Elas são esticadas com `mask-size: 100% 100%` sobre um palco com a mesma proporção, e assim ficam ~4× menores em bytes.

## Review Focus

1. **Look novo sem paleta** (a Beatriz cria `look-10/` e não roda o script): o build falha com "O look-10 ainda não tem paleta: rode npm run paletas", sem página quebrada. Teste na Task 2.
2. **Paleta editada à mão com hex em maiúsculas** (`"#BF343A"`): a máscara é encontrada e gerada com nome em minúsculas. Testes nas Tasks 2 e 3.
3. **Teclado:** Tab até uma amostra destaca a cor. Sair dela volta ao estado fixado. Teste na Task 4.
4. **Toque em outra cor do mesmo croqui:** troca o destaque, e só um fica ativo por croqui. Teste na Task 4.
5. **A máscara alinha com o desenho**: o palco tem exatamente a proporção da imagem. Se não tiver, `mask-size: 100% 100%` desalinha. Teste na Task 4.

---

## Mapa de arquivos

```
src/lib/paleta.ts                 → cor: RGB↔Lab, ΔE, filtros fundo/pele, k-means, fusão, nome, sugerirPaleta, pertenceACor
src/lib/croquis.ts                → chaveDaCor, caminhoDaMascara, resolverMascaras, faixaDaColecao
scripts/gerar-paletas.mjs         → lerPaleta, inserirPaleta, gerarMascara, processarLook, main
src/content.config.ts             → + collection croquis
src/content/croquis/look-01..09/  → index.md, croqui.jpeg, mascara-*.png
src/components/AmostraCor.astro   → botão de cor
src/components/CroquiCard.astro   → croqui + camadas de realce + paleta
src/components/LineUpCroquis.astro→ seção/trilho
src/scripts/destaque-cor.ts       → interação das amostras (delegada)
src/scripts/animacoes/lineup.ts   → desfile (desktop) e carrossel (celular)
src/pages/croquis.astro           → página
src/pages/index.astro             → + bloco "Prancha de croquis"
src/components/Navegacao.astro    → + link Croquis
tests/unit/paleta.test.ts, tests/unit/croquis.test.ts, tests/unit/gerar-paletas.test.ts
tests/e2e/croquis.spec.ts, tests/e2e/qualidade.spec.ts, tests/e2e/compartilhamento.spec.ts
docs/como-editar-conteudo.md
```

---

### Task 1: Lógica de cor (`src/lib/paleta.ts`)

**Files:**
- Create: `src/lib/paleta.ts`
- Test: `tests/unit/paleta.test.ts`

**Interfaces:**
- Produces:
  - `type RGB = [number, number, number]`, `type Lab = [number, number, number]`
  - `hexParaRgb(hex: string): RGB`, `rgbParaHex(rgb: RGB): string` (minúsculas, `#rrggbb`)
  - `rgbParaLab(rgb: RGB): Lab`, `labParaRgb(lab: Lab): RGB`
  - `deltaE(a: Lab, b: Lab): number` (CIE76), `croma(lab: Lab): number`, `matiz(lab: Lab): number` (graus 0–360)
  - `ehFundo(lab: Lab): boolean` (C < 10 e L > 60), `ehPele(rgb: RGB): boolean` (HSV: h 10–35°, s 0,15–0,5, v 0,5–0,95, R máximo)
  - `interface Grupo { centro: Lab; total: number }`, `kmeans(pontos: Lab[], k: number, iteracoes?: number): Grupo[]` (determinístico, ordenado por total desc), `fundirParecidos(grupos: Grupo[], limite?: number): Grupo[]`
  - `nomearCor(lab: Lab): string`
  - `interface CorPaleta { hex: string; nome: string }`, `sugerirPaleta(pixels: RGB[]): { cores: CorPaleta[]; aviso?: string }`
  - `pertenceACor(rgb: RGB, alvo: Lab, limite?: number): boolean` (padrão 18)
- **Regra:** o arquivo não importa nada e usa só sintaxe TS "apagável" (sem `enum`, sem parameter properties), porque o Node o importa direto.

- [ ] **Step 1: Escrever os testes (falhando)** com a ferramenta Write.

`tests/unit/paleta.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  hexParaRgb, rgbParaHex, rgbParaLab, labParaRgb, deltaE, ehFundo, ehPele,
  kmeans, fundirParecidos, nomearCor, sugerirPaleta, pertenceACor, type RGB, type Lab,
} from '../../src/lib/paleta';

const lab = (hex: string) => rgbParaLab(hexParaRgb(hex));
const repetir = (hex: string, n: number): RGB[] => Array.from({ length: n }, () => hexParaRgb(hex));

describe('conversões', () => {
  it('hex ↔ rgb', () => {
    expect(hexParaRgb('#BF343A')).toEqual([191, 52, 58]);
    expect(rgbParaHex([191, 52, 58])).toBe('#bf343a');
  });
  it('rgb → Lab com valores de referência (D65)', () => {
    const [L, a, b] = lab('#ff0000');
    expect(L).toBeCloseTo(53.24, 0);
    expect(a).toBeCloseTo(80.09, 0);
    expect(b).toBeCloseTo(67.2, 0);
    expect(lab('#ffffff')[0]).toBeCloseTo(100, 0);
    expect(lab('#000000')[0]).toBeCloseTo(0, 0);
  });
  it('Lab → rgb volta à cor original', () => {
    for (const hex of ['#bf343a', '#0f74ba', '#f1bc55', '#2b2626', '#cde2f7']) {
      expect(rgbParaHex(labParaRgb(lab(hex)))).toBe(hex);
    }
  });
  it('deltaE é a distância euclidiana em Lab', () => {
    expect(deltaE([50, 0, 0], [53, 4, 0])).toBeCloseTo(5, 6);
  });
});

describe('filtros', () => {
  it('ehFundo descarta branco e cinzas claros da sombra do papel', () => {
    for (const hex of ['#ffffff', '#d4cfcd', '#c9d1d5', '#a1a6ad']) expect(ehFundo(lab(hex)), hex).toBe(true);
  });
  it('ehFundo preserva preto, cores saturadas e azul-claro', () => {
    for (const hex of ['#2b2626', '#bf343a', '#0f74ba', '#cde2f7', '#808080']) expect(ehFundo(lab(hex)), hex).toBe(false);
  });
  it('ehPele reconhece tons de pele dos croquis', () => {
    for (const hex of ['#cb9c86', '#d9aa8e', '#ba856a', '#ce9775', '#ceab9b']) expect(ehPele(hexParaRgb(hex)), hex).toBe(true);
  });
  it('ehPele não descarta roupas vermelhas, amarelas, pretas, azuis nem cabelo escuro', () => {
    for (const hex of ['#bf343a', '#f1bc55', '#2b2626', '#0f74ba', '#5e4c41', '#b76d6d']) {
      expect(ehPele(hexParaRgb(hex)), hex).toBe(false);
    }
  });
});

describe('kmeans', () => {
  const pontos: Lab[] = [
    ...Array.from({ length: 30 }, (_, i): Lab => [20 + (i % 3), 0, 0]),
    ...Array.from({ length: 10 }, (_, i): Lab => [80 + (i % 2), 10, 10]),
  ];
  it('separa grupos óbvios e ordena pelo tamanho', () => {
    const grupos = fundirParecidos(kmeans(pontos, 2));
    expect(grupos.map((g) => g.total)).toEqual([30, 10]);
    expect(grupos[0].centro[0]).toBeCloseTo(21, 0);
    expect(grupos[1].centro[0]).toBeCloseTo(80.5, 0);
  });
  it('é determinístico', () => {
    expect(kmeans(pontos, 4)).toEqual(kmeans(pontos, 4));
  });
  it('lista vazia devolve nenhum grupo', () => {
    expect(kmeans([], 6)).toEqual([]);
  });
  it('fundirParecidos junta centros quase iguais somando os totais', () => {
    const grupos = fundirParecidos([
      { centro: [50, 10, 10], total: 30 },
      { centro: [51, 11, 10], total: 10 },
      { centro: [10, 0, 0], total: 5 },
    ]);
    expect(grupos.map((g) => g.total)).toEqual([40, 5]);
  });
});

describe('nomearCor', () => {
  const casos: Array<[string, string]> = [
    ['#bf343a', 'Vermelho'], ['#ff2e88', 'Rosa'], ['#0f74ba', 'Azul'], ['#cde2f7', 'Azul-claro'],
    ['#1b2a5c', 'Azul-marinho'], ['#f1bc55', 'Amarelo'], ['#2b2626', 'Preto'], ['#ffffff', 'Branco'],
    ['#808080', 'Cinza'], ['#2e8b57', 'Verde'], ['#6b3e1f', 'Marrom'],
  ];
  for (const [hex, nome] of casos) it(`${hex} → ${nome}`, () => expect(nomearCor(lab(hex))).toBe(nome));
});

describe('sugerirPaleta', () => {
  it('ignora fundo e pele, funde quase iguais, descarta ruído e ordena por área', () => {
    const pixels = [
      ...repetir('#ffffff', 500),
      ...repetir('#cb9c86', 300),
      ...repetir('#bf343a', 400),
      ...repetir('#c0353b', 50),
      ...repetir('#0f74ba', 250),
      ...repetir('#2b2626', 200),
      ...repetir('#00ff00', 5),
    ];
    const { cores, aviso } = sugerirPaleta(pixels);
    expect(aviso).toBeUndefined();
    expect(cores.map((c) => c.nome)).toEqual(['Vermelho', 'Azul', 'Preto']);
    expect(deltaE(lab(cores[0].hex), lab('#bf343a'))).toBeLessThan(3);
    for (const c of cores) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('limita a 4 cores', () => {
    const pixels = ['#bf343a', '#0f74ba', '#f1bc55', '#2b2626', '#2e8b57', '#ff2e88'].flatMap((h, i) => repetir(h, 100 + i * 10));
    expect(sugerirPaleta(pixels).cores).toHaveLength(4);
  });
  it('avisa quando não há cores suficientes', () => {
    const { cores, aviso } = sugerirPaleta([...repetir('#ffffff', 100), ...repetir('#bf343a', 100)]);
    expect(cores).toHaveLength(1);
    expect(aviso).toMatch(/escreva a paleta à mão/);
  });
});

describe('pertenceACor', () => {
  const vermelho = lab('#bf343a');
  it('aceita pixels próximos da cor', () => expect(pertenceACor(hexParaRgb('#c43a40'), vermelho)).toBe(true));
  it('recusa fundo, pele e cores distantes', () => {
    expect(pertenceACor(hexParaRgb('#ffffff'), vermelho)).toBe(false);
    expect(pertenceACor(hexParaRgb('#cb9c86'), lab('#cb9c86'))).toBe(false);
    expect(pertenceACor(hexParaRgb('#0f74ba'), vermelho)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/paleta.test.ts`
Expected: FAIL com "Failed to resolve import ../../src/lib/paleta" (ou "Cannot find module").

- [ ] **Step 3: Implementar** com a ferramenta Write.

`src/lib/paleta.ts`:
```ts
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

/** Fundo do papel: claro e quase sem cor (branco, sombras cinza). */
export function ehFundo(lab: Lab): boolean {
  return croma(lab) < 10 && lab[0] > 60;
}

/** Tom de pele dos croquis: laranja dessaturado, de médio a claro (HSV). */
export function ehPele([r, g, b]: RGB): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max !== r || max === min) return false;
  const h = ((g - b) / (max - min)) * 60;
  const s = (max - min) / max;
  const v = max / 255;
  return h >= 10 && h <= 35 && s >= 0.15 && s <= 0.5 && v >= 0.5 && v <= 0.95;
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
  const grupos = fundirParecidos(kmeans(roupa, 6));
  const total = roupa.length;
  let escolhidos = grupos.filter((g) => g.total / total >= 0.03);
  if (escolhidos.length < 3) escolhidos = grupos.filter((g) => g.total / total >= 0.01);
  const cores = escolhidos.slice(0, 4).map((g) => ({ hex: rgbParaHex(labParaRgb(g.centro)), nome: nomearCor(g.centro) }));
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/paleta.test.ts`
Expected: PASS em todos. Se um caso de `nomearCor`, `ehFundo` ou `ehPele` falhar, imprima o Lab/HSV daquela cor (`node -e` importando `./src/lib/paleta.ts`) e ajuste **o limiar da regra**, nunca o caso de teste. Os casos vêm dos croquis reais. Registre a mudança como ruling.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paleta.ts tests/unit/paleta.test.ts
git commit -m "feat: lógica de cor para paletas de croquis (Lab, filtros, k-means, nomes)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Helpers de croquis e script `npm run paletas`

**Files:**
- Create: `src/lib/croquis.ts`, `scripts/gerar-paletas.mjs`
- Modify: `package.json` (script `paletas`, devDependency `yaml`)
- Test: `tests/unit/croquis.test.ts`, `tests/unit/gerar-paletas.test.ts`

**Interfaces:**
- Consumes: `sugerirPaleta`, `pertenceACor`, `hexParaRgb`, `rgbParaLab` (Task 1).
- Produces:
  - `src/lib/croquis.ts`:
    - `interface CorDaPaleta { hex: string; nome: string }`
    - `chaveDaCor(hex: string): string` (sem `#`, minúsculas)
    - `caminhoDaMascara(lookId: string, hex: string): string` → `/src/content/croquis/<lookId>/mascara-<chave>.png`
    - `resolverMascaras<T>(lookId: string, paleta: CorDaPaleta[] | undefined, mapa: Record<string, T>): Array<CorDaPaleta & { chave: string; mascara: T }>`. Lança erro com mensagem em português quando falta paleta ou máscara.
    - `faixaDaColecao(looks: { paleta?: CorDaPaleta[] }[]): string[]`
  - `scripts/gerar-paletas.mjs`:
    - `lerPaleta(md: string): CorDaPaleta[] | null`
    - `inserirPaleta(md: string, paleta: CorDaPaleta[]): string`
    - `gerarMascara(arquivoCroqui: string, hex: string, destino: string): Promise<void>`
    - `processarLook(pasta: string): Promise<{ paleta: CorDaPaleta[]; criada: boolean; mascaras: string[]; removidas: string[]; aviso?: string }>`

- [ ] **Step 1: Escrever os testes (falhando)** com a ferramenta Write.

`tests/unit/croquis.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { chaveDaCor, caminhoDaMascara, resolverMascaras, faixaDaColecao } from '../../src/lib/croquis';

describe('chaveDaCor / caminhoDaMascara', () => {
  it('remove # e normaliza para minúsculas', () => {
    expect(chaveDaCor('#BF343A')).toBe('bf343a');
    expect(caminhoDaMascara('look-03', '#BF343A')).toBe('/src/content/croquis/look-03/mascara-bf343a.png');
  });
});

describe('resolverMascaras', () => {
  const paleta = [{ hex: '#BF343A', nome: 'Vermelho' }, { hex: '#2b2626', nome: 'Preto' }];
  const mapa = {
    '/src/content/croquis/look-01/mascara-bf343a.png': 'M1',
    '/src/content/croquis/look-01/mascara-2b2626.png': 'M2',
  };
  it('associa cada cor à sua máscara, mesmo com hex em maiúsculas', () => {
    expect(resolverMascaras('look-01', paleta, mapa)).toEqual([
      { hex: '#BF343A', nome: 'Vermelho', chave: 'bf343a', mascara: 'M1' },
      { hex: '#2b2626', nome: 'Preto', chave: '2b2626', mascara: 'M2' },
    ]);
  });
  it('look sem paleta: erro claro pedindo para rodar o script', () => {
    expect(() => resolverMascaras('look-10', undefined, mapa)).toThrow('O look-10 ainda não tem paleta: rode npm run paletas');
  });
  it('máscara faltando: erro claro com a cor e o look', () => {
    expect(() => resolverMascaras('look-02', paleta, mapa)).toThrow('Falta a máscara de #BF343A em look-02: rode npm run paletas');
  });
});

describe('faixaDaColecao', () => {
  it('junta as paletas na ordem, ignorando looks sem paleta', () => {
    expect(
      faixaDaColecao([
        { paleta: [{ hex: '#111111', nome: 'a' }, { hex: '#222222', nome: 'b' }] },
        {},
        { paleta: [{ hex: '#333333', nome: 'c' }] },
      ]),
    ).toEqual(['#111111', '#222222', '#333333']);
  });
});
```

`tests/unit/gerar-paletas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { processarLook, lerPaleta, inserirPaleta } from '../../scripts/gerar-paletas.mjs';

const MD = '---\ntitulo: Look 99\nordem: 99\nimagem: ./croqui.png\nalt: Teste\n---\n';

/** Croqui sintético 200×300: faixas de fundo, pele, vermelho, azul e preto. */
async function criarLook(): Promise<string> {
  const pasta = mkdtempSync(join(tmpdir(), 'look-'));
  const faixas: Array<[number, [number, number, number]]> = [
    [40, [255, 255, 255]],
    [60, [203, 156, 134]],
    [90, [191, 52, 58]],
    [60, [15, 116, 186]],
    [50, [43, 38, 38]],
  ];
  const buf = Buffer.alloc(200 * 300 * 3);
  let linha = 0;
  for (const [altura, [r, g, b]] of faixas) {
    for (let y = linha; y < linha + altura; y++) {
      for (let x = 0; x < 200; x++) buf.set([r, g, b], (y * 200 + x) * 3);
    }
    linha += altura;
  }
  await sharp(buf, { raw: { width: 200, height: 300, channels: 3 } }).png().toFile(join(pasta, 'croqui.png'));
  writeFileSync(join(pasta, 'index.md'), MD);
  return pasta;
}

async function alfa(arquivo: string, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3];
}

describe('lerPaleta / inserirPaleta', () => {
  it('insere a paleta no frontmatter preservando os outros campos', () => {
    const md = inserirPaleta(MD, [{ hex: '#bf343a', nome: 'Vermelho' }]);
    expect(lerPaleta(md)).toEqual([{ hex: '#bf343a', nome: 'Vermelho' }]);
    expect(parse(md.split('---')[1]).titulo).toBe('Look 99');
  });
  it('sem paleta devolve null', () => expect(lerPaleta(MD)).toBeNull());
});

describe('processarLook', () => {
  it('grava a paleta sugerida quando ausente e gera uma máscara por cor', async () => {
    const pasta = await criarLook();
    const r = await processarLook(pasta);
    expect(r.criada).toBe(true);
    expect(r.paleta.map((c) => c.nome)).toEqual(['Vermelho', 'Azul', 'Preto']);
    expect(lerPaleta(readFileSync(join(pasta, 'index.md'), 'utf8'))).toEqual(r.paleta);
    for (const nome of r.mascaras) expect(existsSync(join(pasta, nome))).toBe(true);
    const vermelho = join(pasta, `mascara-${r.paleta[0].hex.slice(1)}.png`);
    expect(await alfa(vermelho, 100, 145)).toBe(255); // dentro do vermelho
    expect(await alfa(vermelho, 100, 20)).toBe(0); // fundo
    expect(await alfa(vermelho, 100, 70)).toBe(0); // pele
    expect(await alfa(vermelho, 100, 220)).toBe(0); // azul
  });

  it('nunca altera uma paleta escrita à mão (inclusive com hex em maiúsculas)', async () => {
    const pasta = await criarLook();
    const manual = `${MD.slice(0, -4)}paleta:\n  - hex: "#BF343A"\n    nome: Rubi\n  - hex: "#0f74ba"\n    nome: Azul\n  - hex: "#2b2626"\n    nome: Preto\n---\n`;
    writeFileSync(join(pasta, 'index.md'), manual);
    const r = await processarLook(pasta);
    expect(r.criada).toBe(false);
    expect(readFileSync(join(pasta, 'index.md'), 'utf8')).toBe(manual);
    expect(r.mascaras).toEqual(['mascara-bf343a.png', 'mascara-0f74ba.png', 'mascara-2b2626.png']);
    expect(existsSync(join(pasta, 'mascara-bf343a.png'))).toBe(true);
  });

  it('apaga máscaras de cores que saíram da paleta', async () => {
    const pasta = await criarLook();
    writeFileSync(join(pasta, 'mascara-abcdef.png'), 'velha');
    const r = await processarLook(pasta);
    expect(r.removidas).toEqual(['mascara-abcdef.png']);
    expect(existsSync(join(pasta, 'mascara-abcdef.png'))).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/croquis.test.ts tests/unit/gerar-paletas.test.ts`
Expected: FAIL nos dois, com módulo `src/lib/croquis` e `scripts/gerar-paletas.mjs` não encontrados.

- [ ] **Step 3: Implementar**

`npm install -D yaml@2.9.1` e, em `package.json`, adicione em `scripts`: `"paletas": "node scripts/gerar-paletas.mjs"`.

`src/lib/croquis.ts`:
```ts
// Sem imports: também é importado direto pelo Node no scripts/gerar-paletas.mjs.
export interface CorDaPaleta {
  hex: string;
  nome: string;
}

export function chaveDaCor(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

export function caminhoDaMascara(lookId: string, hex: string): string {
  return `/src/content/croquis/${lookId}/mascara-${chaveDaCor(hex)}.png`;
}

export function resolverMascaras<T>(
  lookId: string,
  paleta: CorDaPaleta[] | undefined,
  mapa: Record<string, T>,
): Array<CorDaPaleta & { chave: string; mascara: T }> {
  if (!paleta || paleta.length === 0) throw new Error(`O ${lookId} ainda não tem paleta: rode npm run paletas`);
  return paleta.map((cor) => {
    const mascara = mapa[caminhoDaMascara(lookId, cor.hex)];
    if (!mascara) throw new Error(`Falta a máscara de ${cor.hex} em ${lookId}: rode npm run paletas`);
    return { ...cor, chave: chaveDaCor(cor.hex), mascara };
  });
}

export function faixaDaColecao(looks: { paleta?: CorDaPaleta[] }[]): string[] {
  return looks.flatMap((l) => (l.paleta ?? []).map((c) => c.hex));
}
```

`scripts/gerar-paletas.mjs` (com a ferramenta Write):
```js
// Sugere paletas e gera máscaras de cor dos croquis.
// Regra de ouro: NUNCA altera uma paleta já escrita no index.md; máscaras são sempre regeneradas.
import sharp from 'sharp';
import { parse } from 'yaml';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hexParaRgb, pertenceACor, rgbParaLab, sugerirPaleta } from '../src/lib/paleta.ts';
import { chaveDaCor } from '../src/lib/croquis.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const LARGURA_ANALISE = 160;
const LARGURA_MASCARA = 600;

export function lerPaleta(md) {
  const m = md.match(FRONTMATTER);
  if (!m) throw new Error('index.md sem frontmatter (bloco entre ---)');
  const dados = parse(m[1]) ?? {};
  return Array.isArray(dados.paleta) && dados.paleta.length ? dados.paleta : null;
}

export function inserirPaleta(md, paleta) {
  const bloco = ['paleta:', ...paleta.flatMap((c) => [`  - hex: "${c.hex}"`, `    nome: ${c.nome}`])].join('\n');
  return md.replace(FRONTMATTER, (_tudo, corpo) => `---\n${corpo}\n${bloco}\n---`);
}

function acharCroqui(pasta) {
  const nome = readdirSync(pasta).find((f) => /^croqui\.(jpe?g|png|webp)$/i.test(f));
  if (!nome) throw new Error(`${pasta}: falta o arquivo croqui.jpeg (ou .jpg/.png/.webp)`);
  return join(pasta, nome);
}

async function lerPixels(arquivo, largura) {
  const { data, info } = await sharp(arquivo)
    .resize({ width: largura, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

export async function gerarMascara(arquivoCroqui, hex, destino) {
  const { data, info } = await lerPixels(arquivoCroqui, LARGURA_MASCARA);
  const alvo = rgbParaLab(hexParaRgb(hex));
  const rgba = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j + 3] = pertenceACor([data[i], data[i + 1], data[i + 2]], alvo) ? 255 : 0;
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1)
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

export async function processarLook(pasta) {
  const arquivoMd = join(pasta, 'index.md');
  const md = readFileSync(arquivoMd, 'utf8');
  const croqui = acharCroqui(pasta);
  let paleta = lerPaleta(md);
  let criada = false;
  let aviso;

  if (!paleta) {
    const { data } = await lerPixels(croqui, LARGURA_ANALISE);
    const pixels = [];
    for (let i = 0; i < data.length; i += 3) pixels.push([data[i], data[i + 1], data[i + 2]]);
    const sugestao = sugerirPaleta(pixels);
    aviso = sugestao.aviso;
    if (sugestao.cores.length >= 3) {
      paleta = sugestao.cores;
      writeFileSync(arquivoMd, inserirPaleta(md, paleta));
      criada = true;
    }
  }

  const mascaras = [];
  for (const cor of paleta ?? []) {
    const nome = `mascara-${chaveDaCor(cor.hex)}.png`;
    await gerarMascara(croqui, cor.hex, join(pasta, nome));
    mascaras.push(nome);
  }
  const removidas = readdirSync(pasta).filter((f) => /^mascara-.*\.png$/.test(f) && !mascaras.includes(f));
  for (const f of removidas) unlinkSync(join(pasta, f));

  return { paleta: paleta ?? [], criada, mascaras, removidas, aviso };
}

async function main() {
  const raiz = fileURLToPath(new URL('../src/content/croquis/', import.meta.url));
  if (!existsSync(raiz)) {
    console.log('Nenhum croqui em src/content/croquis.');
    return;
  }
  const pastas = readdirSync(raiz, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  let problemas = 0;
  for (const nome of pastas) {
    const pasta = join(raiz, nome);
    if (!existsSync(join(pasta, 'index.md'))) {
      console.log(`  ! ${nome}: sem index.md, ignorado`);
      continue;
    }
    const r = await processarLook(pasta);
    const cores = r.paleta.map((c) => `${c.hex} ${c.nome}`).join(', ') || '(sem paleta)';
    const extra = r.removidas.length ? ` · máscaras removidas: ${r.removidas.join(', ')}` : '';
    console.log(`  ${r.criada ? '+' : '='} ${nome}: ${cores}${extra}`);
    if (r.aviso) {
      problemas++;
      console.log(`    ! ${r.aviso}`);
    }
  }
  if (problemas) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/croquis.test.ts tests/unit/gerar-paletas.test.ts`
Expected: PASS. Se a paleta do look sintético vier com uma 4ª cor de borda (mistura entre faixas), confira a área mínima de 3% em `sugerirPaleta`: as bordas são poucos pixels e devem cair abaixo dela.

Run: `npm test`
Expected: toda a suíte unitária verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/croquis.ts scripts/gerar-paletas.mjs tests/unit/croquis.test.ts tests/unit/gerar-paletas.test.ts package.json package-lock.json
git commit -m "feat: script npm run paletas (sugere paleta e gera máscaras por cor)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Collection `croquis`, looks reais e paletas geradas

**Files:**
- Modify: `src/content.config.ts` (nova collection)
- Create: `src/content/croquis/look-01..09/index.md`. Mova cada `croqui.jpeg` de `src/assets/`. As `mascara-*.png` são geradas.

**Interfaces:**
- Consumes: `npm run paletas` (Task 2).
- Produces: collection `croquis`, com entradas de id `look-01`…`look-09` e `data: { titulo, ordem, imagem: ImageMetadata, alt, paleta?: { hex, nome }[] }`. Máscaras em `src/content/croquis/<id>/mascara-<chave>.png`.

- [ ] **Step 1: Adicionar a collection ao schema**

Em `src/content.config.ts`, antes de `export const collections`, adicione:
```ts
const croquis = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/croquis' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      ordem: z.number().int(),
      imagem: image(),
      alt: z.string().min(1, 'Descreva o croqui (texto alternativo)'),
      paleta: z
        .array(z.object({ hex: corHex, nome: z.string().min(1) }))
        .min(3, 'A paleta precisa de 3 a 4 cores')
        .max(4, 'A paleta precisa de 3 a 4 cores')
        .optional(),
    }),
});
```
e troque a última linha por `export const collections = { colecoes, pecas, sobre, croquis };`.

- [ ] **Step 2: Mover os croquis e criar os `index.md`**

```bash
cd src/assets
for par in \
  "21.46.12.jpeg:01" "21.46.12 (1).jpeg:02" "21.46.12 (2).jpeg:03" \
  "21.46.13.jpeg:04" "21.46.13 (1).jpeg:05" "21.46.13 (2).jpeg:06" \
  "21.46.13 (3).jpeg:07" "21.46.13 (4).jpeg:08" "21.46.14.jpeg:09"; do
  arq="WhatsApp Image 2026-10-02 at ${par%%:*}"; n="${par##*:}"
  mkdir -p "../content/croquis/look-$n" && mv "$arq" "../content/croquis/look-$n/croqui.jpeg"
done
cd ../.. && ls src/assets src/content/croquis/*
```
Expected: em `src/assets` sobra só `og-padrao.jpg`, e cada `look-NN/` tem `croqui.jpeg`.

Crie um `index.md` em cada pasta (sem `paleta`, que o script preenche), no formato:
```md
---
titulo: Look 01
ordem: 1
imagem: ./croqui.jpeg
alt: Croqui de vestido curto preto com recortes de coração vermelhos e mangas bufantes, com sandálias pretas.
---
```
Os `alt` de cada look:
- **01:** Croqui de vestido curto preto com recortes de coração vermelhos e mangas bufantes, com sandálias pretas.
- **02:** Croqui de conjunto de jaqueta curta e minissaia transpassada com estampa azul e branca de corações, com argolas douradas.
- **03:** Croqui de jaqueta e minissaia jeans com bolsos em forma de coração e bolsa vermelha de coração.
- **04:** Croqui de blusa vermelha de manga longa com recorte assimétrico no decote, minissaia jeans com fivela de coração e bolsa vermelha de coração.
- **05:** Croqui de vestido curto azul-claro frente única com recortes laterais e detalhe de coração na cintura, com botas pretas.
- **06:** Croqui de macaquinho amarelo com alças de laço e pespontos, bolsa azul transversal e sapatos de coração vermelhos.
- **07:** Croqui de macacão azul de pernas amplas com decote assimétrico e recorte lateral na cintura.
- **08:** Croqui de macacão preto tomara que caia com corpete vermelho em forma de coração.
- **09:** Croqui de macacão pantacourt vermelho com estampa branca em zigue-zague, alça única e laço no ombro.

`titulo` = `Look NN` e `ordem` = NN (inteiro).

- [ ] **Step 3: Gerar as paletas e conferir**

Run: `npm run paletas`
Expected: 9 linhas `+ look-NN: #xxxxxx Nome, …`, com 3 ou 4 cores cada e saída 0.

Rode de novo: `npm run paletas`
Expected: 9 linhas começando com `=`. Nenhum `index.md` muda (`git diff --stat src/content/croquis` não muda entre as duas execuções).

**Conferência real (obrigatória):**
- Abra cada `croqui.jpeg` junto da paleta e confira se as cores são da **roupa e dos acessórios**, não da pele, do fundo ou de sombra cinza.
- Monte uma folha de contato no scratchpad: um script `sharp` que compõe as 9 miniaturas lado a lado, com as faixas de cor embaixo. Abra o PNG com Read.
- Cor espúria (marrom de cabelo ocupando o lugar de uma cor da roupa, cinza de sombra): edite à mão o `paleta` daquele `index.md` e rode `npm run paletas` de novo. A paleta manual é preservada e só as máscaras se refazem.
- Confira uma máscara de cada look abrindo o PNG: a área branca deve cobrir a peça daquela cor.
- Registre cada edição manual como ruling no ledger.

Run: `npx astro sync && npx astro check`
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/croquis src/assets
git commit -m "feat: croquis reais com paletas de cor e máscaras geradas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Página `/croquis` com paletas e destaque de cor

**Files:**
- Create: `src/components/AmostraCor.astro`, `src/components/CroquiCard.astro`, `src/components/LineUpCroquis.astro`, `src/scripts/destaque-cor.ts`, `src/pages/croquis.astro`
- Modify: `src/components/Navegacao.astro` (link Croquis)
- Test: `tests/e2e/croquis.spec.ts`

**Interfaces:**
- Consumes: collection `croquis` (Task 3); `resolverMascaras`, `faixaDaColecao`, `CorDaPaleta` (Task 2); layout `Revista` (Props `titulo?`, `descricao?`, `imagemOg?`).
- Produces:
  - **Seção:** `section.lineup[data-anim="lineup"] > .lineup__trilho`.
  - **Card:** `article.croqui[data-croqui]#look-NN`, com `.croqui__rotulo`, `.croqui__palco` (`style aspect-ratio`), `img.croqui__base`, `img.croqui__realce[data-realce=<chave>]` (style `--mascara`) e `button.amostra[data-amostra=<chave>][aria-pressed]`.
  - **Estado:**
    - `.croqui__palco[data-destacando]` quando há destaque;
    - `.croqui__realce.ativo` na cor ativa;
    - `.faixa > span` na faixa da coleção.
  - **Hooks para a Task 5:**
    - classes `lineup--desfile` e `lineup--carrossel` na seção;
    - atributo `data-em-foco` no card.

- [ ] **Step 1: Escrever os testes (falhando)** com a ferramenta Write.

`tests/e2e/croquis.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

const LOOKS = Array.from({ length: 9 }, (_, i) => `Look 0${i + 1}`);

async function abrirGrade(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/croquis');
}

test('lista os 9 looks na ordem, cada um com 3 a 4 cores', async ({ page }) => {
  await abrirGrade(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Croquis');
  await expect(page.locator('[data-croqui] .croqui__rotulo')).toHaveText(LOOKS);
  for (const card of await page.locator('[data-croqui]').all()) {
    const n = await card.locator('[data-amostra]').count();
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(4);
  }
});

test('faixa da coleção tem uma faixa por cor de todas as paletas', async ({ page }) => {
  await abrirGrade(page);
  const totalCores = await page.locator('[data-amostra]').count();
  await expect(page.locator('.faixa > span')).toHaveCount(totalCores);
});

test('tocar numa cor destaca a área dela no croqui e tocar de novo desliga', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').first();
  const amostra = card.locator('[data-amostra]').first();
  const chave = (await amostra.getAttribute('data-amostra'))!;

  await amostra.click();
  await expect(amostra).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.croqui__palco')).toHaveAttribute('data-destacando', '');
  const realce = card.locator('.croqui__realce.ativo');
  await expect(realce).toHaveCount(1);
  await expect(realce).toHaveAttribute('data-realce', chave);
  await expect(realce).toHaveCSS('opacity', '1');
  const mascara = await realce.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.maskImage || s.webkitMaskImage;
  });
  expect(mascara).toContain(`mascara-${chave}`);
  const url = mascara.match(/url\("?([^")]+)"?\)/)![1];
  const resposta = await page.request.get(new URL(url).pathname);
  expect(resposta.ok()).toBe(true);
  expect(resposta.headers()['content-type']).toContain('image/png');

  await amostra.click();
  await expect(amostra).toHaveAttribute('aria-pressed', 'false');
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(0);
});

test('tocar em outra cor do mesmo croqui troca o destaque (só um ativo)', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').first();
  const [a1, a2] = [card.locator('[data-amostra]').nth(0), card.locator('[data-amostra]').nth(1)];
  await a1.click();
  await a2.click();
  await expect(a1).toHaveAttribute('aria-pressed', 'false');
  await expect(a2).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(1);
  await expect(card.locator('.croqui__realce.ativo')).toHaveAttribute('data-realce', (await a2.getAttribute('data-amostra'))!);
});

test('teclado: focar uma cor destaca, sair volta ao normal', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').nth(1);
  const amostra = card.locator('[data-amostra]').first();
  await amostra.focus();
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(1);
  await amostra.evaluate((el) => (el as HTMLElement).blur());
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(0);
});

test('o palco tem a proporção exata do desenho (máscara alinhada)', async ({ page }) => {
  await abrirGrade(page);
  for (const card of await page.locator('[data-croqui]').all()) {
    await card.scrollIntoViewIfNeeded();
    const [caixa, natural] = await card.locator('.croqui__base').evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const r = img.getBoundingClientRect();
      return [r.width / r.height, img.naturalWidth / img.naturalHeight];
    });
    expect(Math.abs(caixa - natural) / natural).toBeLessThan(0.01);
  }
});

test('com movimento reduzido: grade com todas as paletas visíveis', async ({ page }) => {
  await abrirGrade(page);
  const secao = page.locator('section.lineup');
  await expect(secao).not.toHaveClass(/lineup--desfile|lineup--carrossel/);
  expect(await page.locator('.lineup__trilho').evaluate((el) => getComputedStyle(el).display)).toBe('grid');
  for (const a of await page.locator('[data-amostra]').all()) await expect(a).toBeVisible();
});

test('o menu leva à página de croquis', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Croquis' }),
  ).toHaveAttribute('href', '/croquis');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/croquis.spec.ts`
Expected: FAIL (404 em `/croquis`, link Croquis ausente).

- [ ] **Step 3: Implementar**

`src/components/AmostraCor.astro`:
```astro
---
interface Props {
  hex: string;
  nome: string;
  chave: string;
  titulo: string;
}
const { hex, nome, chave, titulo } = Astro.props;
---
<button
  type="button"
  class="amostra"
  data-amostra={chave}
  aria-pressed="false"
  aria-label={`Destacar ${nome} ${hex} no ${titulo}`}
  style={`--cor: ${hex}`}
>
  <span class="amostra__bola" aria-hidden="true"></span>
  <span class="amostra__nome">{nome}</span>
  <span class="amostra__hex">{hex}</span>
</button>

<style>
  .amostra {
    display: grid; grid-template-columns: auto 1fr; column-gap: 0.6rem; align-items: center;
    width: 100%; padding: 0.35rem 0.5rem; border: 2px solid transparent; background: none;
    font: inherit; color: var(--tinta); text-align: left; cursor: pointer;
  }
  .amostra:hover, .amostra[aria-pressed='true'] { border-color: var(--tinta); }
  .amostra__bola {
    grid-row: span 2; width: 2.1rem; height: 2.1rem; border-radius: 50%;
    background: var(--cor); border: 2px solid var(--tinta);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .amostra:hover .amostra__bola, .amostra[aria-pressed='true'] .amostra__bola { transform: scale(1.15); }
  .amostra__nome { font-family: var(--fonte-display); font-size: 1.05rem; line-height: 1.1; }
  .amostra__hex { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
</style>
```

`src/components/CroquiCard.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import AmostraCor from './AmostraCor.astro';
import type { CorDaPaleta } from '../lib/croquis';

interface Props {
  id: string;
  titulo: string;
  alt: string;
  imagem: ImageMetadata;
  cores: Array<CorDaPaleta & { chave: string; mascara: ImageMetadata }>;
}
const { id, titulo, alt, imagem, cores } = Astro.props;
// Base e camadas de realce usam o MESMO arquivo, para baixar uma vez só.
const base = await getImage({ src: imagem, width: Math.min(800, imagem.width), format: 'webp' });
const mascaras = await Promise.all(cores.map((c) => getImage({ src: c.mascara, format: 'png' })));
---
<article class="croqui" id={id} data-croqui>
  <p class="croqui__rotulo">{titulo}</p>
  <div class="croqui__palco" style={`aspect-ratio: ${imagem.width} / ${imagem.height}`}>
    <img
      class="croqui__base"
      src={base.src}
      alt={alt}
      width={base.attributes.width}
      height={base.attributes.height}
      loading="lazy"
      decoding="async"
    />
    {cores.map((c, i) => (
      <img
        class="croqui__realce"
        data-realce={c.chave}
        src={base.src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        style={`--mascara: url(${mascaras[i].src})`}
      />
    ))}
  </div>
  <ul class="croqui__paleta" aria-label={`Paleta do ${titulo}`}>
    {cores.map((c) => (
      <li><AmostraCor hex={c.hex} nome={c.nome} chave={c.chave} titulo={titulo} /></li>
    ))}
  </ul>
</article>

<script>
  import '../scripts/destaque-cor.ts';
</script>

<style>
  .croqui { display: grid; gap: 0.75rem; align-content: end; }
  .croqui__rotulo {
    margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  }
  .croqui__palco { position: relative; width: 100%; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s; }
  .croqui__base, .croqui__realce {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill;
  }
  .croqui__base { transition: filter 0.3s, opacity 0.3s; }
  .croqui__palco[data-destacando] .croqui__base { filter: grayscale(1); opacity: 0.35; }
  .croqui__realce {
    pointer-events: none; opacity: 0; transition: opacity 0.3s;
    -webkit-mask-image: var(--mascara); mask-image: var(--mascara);
    -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  .croqui__realce.ativo { opacity: 1; }
  .croqui__paleta { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }

  /* Modos do line-up (classes postas pelo módulo de animação). */
  :global(.lineup--desfile) .croqui__palco { height: 58vh; width: auto; }
  :global(.lineup--desfile) .croqui:not([data-em-foco]) .croqui__palco,
  :global(.lineup--carrossel) .croqui:not([data-em-foco]) .croqui__palco { opacity: 0.5; }
  :global(.lineup--desfile) .croqui[data-em-foco] .croqui__palco { transform: scale(1.08); transform-origin: bottom center; }
  .croqui[data-em-foco] .croqui__rotulo { color: var(--vermelho-texto); }

  @media (prefers-reduced-motion: reduce) {
    .croqui__palco, .croqui__base, .croqui__realce { transition: none; }
  }
</style>
```

`src/components/LineUpCroquis.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import CroquiCard from './CroquiCard.astro';
import type { CorDaPaleta } from '../lib/croquis';

interface Look {
  id: string;
  titulo: string;
  alt: string;
  imagem: ImageMetadata;
  cores: Array<CorDaPaleta & { chave: string; mascara: ImageMetadata }>;
}
interface Props {
  looks: Look[];
}
const { looks } = Astro.props;
---
<section class="lineup" data-anim="lineup" aria-label="Line-up de croquis">
  <div class="lineup__trilho">
    {looks.map((l) => <CroquiCard {...l} />)}
  </div>
</section>

<style>
  .lineup { padding-block: 2rem 4rem; }
  .lineup__trilho {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 3rem 2rem;
    width: min(100% - 2 * var(--gutter), var(--max)); margin-inline: auto;
  }
  .lineup--desfile { height: 100vh; overflow: hidden; display: flex; align-items: center; padding-block: 0; }
  .lineup--desfile .lineup__trilho {
    display: flex; align-items: flex-end; gap: 4vw; width: max-content; margin: 0; padding-inline: 12vw;
  }
  .lineup--desfile .lineup__trilho > :global(*) { width: auto; }
  .lineup--carrossel .lineup__trilho {
    display: flex; gap: 1.5rem; width: 100%; margin: 0; padding: 0 11vw 1rem;
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
  }
  .lineup--carrossel .lineup__trilho > :global(*) { flex: 0 0 78vw; scroll-snap-align: center; }
</style>
```

`src/scripts/destaque-cor.ts`:
```ts
// Amostras de cor: hover/foco mostram o destaque; clique/toque liga e desliga (um por croqui).
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

function amostraDe(evento: Event) {
  const botao = (evento.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-amostra]');
  const croqui = botao?.closest<HTMLElement>('[data-croqui]');
  return botao && croqui ? { botao, croqui } : null;
}

document.addEventListener('click', (evento) => {
  const alvo = amostraDe(evento);
  if (!alvo) return;
  const ligar = alvo.botao.getAttribute('aria-pressed') !== 'true';
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
```

`src/pages/croquis.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import Revista from '../layouts/Revista.astro';
import LineUpCroquis from '../components/LineUpCroquis.astro';
import { faixaDaColecao, resolverMascaras } from '../lib/croquis';

const mapa = import.meta.glob<ImageMetadata>('/src/content/croquis/*/mascara-*.png', { eager: true, import: 'default' });
const looks = (await getCollection('croquis')).sort((a, b) => a.data.ordem - b.data.ordem);
const preparados = looks.map((l) => ({
  id: l.id,
  titulo: l.data.titulo,
  alt: l.data.alt,
  imagem: l.data.imagem,
  cores: resolverMascaras(l.id, l.data.paleta, mapa),
}));
const faixa = faixaDaColecao(looks.map((l) => l.data));
---
<Revista
  titulo="Croquis"
  descricao="Prancha de croquis de Beatriz: nove looks desenhados à mão, com a paleta de cores de cada um."
  imagemOg={looks[0]?.data.imagem}
>
  <header class="container croquis-topo">
    <p class="kicker">Prancha de coleção</p>
    <h1 data-anim="revelar">Croquis</h1>
    <p class="croquis-topo__linha">
      Nove looks, um mesmo coração. Toque numa cor para ver onde ela vive em cada desenho.
    </p>
  </header>
  <div class="faixa" aria-hidden="true">
    {faixa.map((hex) => <span style={`--cor: ${hex}`}></span>)}
  </div>
  <LineUpCroquis looks={preparados} />
</Revista>

<style>
  .croquis-topo { padding-block: 3rem 1.5rem; }
  .croquis-topo__linha { max-width: 48ch; font-size: 1.15rem; margin-top: 1rem; }
  .faixa { display: flex; height: 18px; margin-bottom: 1rem; }
  .faixa span { flex: 1; background: var(--cor); }
</style>
```

Em `src/components/Navegacao.astro`, adicione o link entre Processo e Sobre:
```astro
  { href: '/croquis', texto: 'Croquis' },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/croquis.spec.ts`
Expected: PASS (16 testes: 8 × desktop/mobile). O teste de proporção falha se o palco não tiver o `aspect-ratio` do desenho. Corrija o CSS, não o teste.

Run: `npx astro check && npx playwright test`
Expected: 0 erros e a suíte inteira verde (o menu com 5 itens não pode gerar rolagem horizontal).

- [ ] **Step 5: Conferência visual**

Gere screenshots (scratchpad, `astro preview` numa porta livre, `MSYS_NO_PATHCONV=1`): `/croquis` a 1440px e a 375px, com movimento reduzido, e um croqui com uma cor ativa. Confira com Read que a área destacada coincide com a peça daquela cor. Se a máscara pegar demais ou de menos, ajuste o `limite` de `pertenceACor` (padrão 18), rode `npm run paletas` e registre como ruling.

- [ ] **Step 6: Commit**

```bash
git add src/components/AmostraCor.astro src/components/CroquiCard.astro src/components/LineUpCroquis.astro src/scripts/destaque-cor.ts src/pages/croquis.astro src/components/Navegacao.astro tests/e2e/croquis.spec.ts
git commit -m "feat: página de croquis com paletas e destaque de cor no desenho

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Line-up que desfila (desktop) e carrossel (celular)

**Files:**
- Create: `src/scripts/animacoes/lineup.ts`
- Modify: `src/scripts/animacoes/index.ts` (registrar o módulo)
- Test: `tests/e2e/croquis.spec.ts` (novos testes ao final)

**Interfaces:**
- Consumes:
  - `section.lineup[data-anim="lineup"]`, `.lineup__trilho` e `[data-croqui]` (Task 4);
  - o contrato de módulo `iniciar(gsap: typeof GSAP): () => void` de `src/scripts/animacoes/index.ts`.
- Produces:
  - `lineup--desfile` na seção (≥768px), com pin e scrub horizontal;
  - `lineup--carrossel` na seção (<768px);
  - `data-em-foco` no card em destaque.

- [ ] **Step 1: Escrever os testes (falhando)**

Acrescente ao final de `tests/e2e/croquis.spec.ts`:
```ts
const numeroEmFoco = (page: Page) =>
  page.locator('[data-croqui][data-em-foco] .croqui__rotulo').textContent().then((t) => Number(t?.replace(/\D/g, '')));

test('desktop: a fila desfila com a rolagem e o look em foco muda', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no celular é carrossel');
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  await expect(page.locator('section.lineup')).toHaveClass(/lineup--desfile/);
  await page.locator('section.lineup').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
  await expect(page.locator('[data-croqui][data-em-foco]')).toHaveCount(1);
  const inicio = await numeroEmFoco(page);
  await page.evaluate(() => window.scrollBy(0, 4000));
  await expect.poll(() => numeroEmFoco(page)).toBeGreaterThan(inicio);
});

test('celular: deslizar o carrossel troca o look em foco', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'no desktop é desfile');
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  await expect(page.locator('section.lineup')).toHaveClass(/lineup--carrossel/);
  await page.locator('.lineup__trilho').scrollIntoViewIfNeeded();
  await expect.poll(() => numeroEmFoco(page)).toBe(1);
  await page.locator('.lineup__trilho').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect.poll(() => numeroEmFoco(page)).toBe(9);
});

test('navegar e voltar não acumula gatilhos do desfile', async ({ page }) => {
  await page.goto('/croquis');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-animacoes', 'ativas');
  const gatilhos = await html.getAttribute('data-gatilhos');
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Coleções' }).click();
  await expect(page).toHaveURL(/\/colecoes$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/croquis$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '3');
  await expect(html).toHaveAttribute('data-gatilhos', gatilhos!);
  await expect(page.locator('[data-croqui][data-em-foco]')).toHaveCount(1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/croquis.spec.ts -g "desfila|carrossel|acumula"`
Expected: FAIL (seção sem `lineup--desfile`/`lineup--carrossel`, nenhum `data-em-foco`).

- [ ] **Step 3: Implementar**

`src/scripts/animacoes/lineup.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

function focar(cards: HTMLElement[], escolhido: HTMLElement | undefined) {
  cards.forEach((c) => c.toggleAttribute('data-em-foco', c === escolhido));
}

function maisPertoDoCentro(cards: HTMLElement[]): HTMLElement | undefined {
  const centro = window.innerWidth / 2;
  let melhor: HTMLElement | undefined;
  let menor = Infinity;
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - centro);
    if (d < menor) {
      menor = d;
      melhor = c;
    }
  }
  return melhor;
}

/**
 * Desktop: a seção fica presa e a rolagem leva a fila de croquis na horizontal (desfile).
 * Celular: carrossel com scroll-snap; o look encaixado no centro fica em foco.
 */
export function iniciar(gsap: typeof GSAP): () => void {
  const secoes = gsap.utils.toArray<HTMLElement>('[data-anim="lineup"]');
  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', () => {
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--desfile');
      const distancia = () => Math.max(0, trilho.scrollWidth - window.innerWidth);
      const atualizar = () => focar(cards, maisPertoDoCentro(cards));
      gsap.to(trilho, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: secao,
          pin: true,
          start: 'top top',
          end: () => `+=${distancia()}`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: atualizar,
          onRefresh: atualizar,
        },
      });
      atualizar();
    });
    return () => {
      secoes.forEach((s) => {
        s.classList.remove('lineup--desfile');
        s.querySelectorAll('[data-em-foco]').forEach((c) => c.removeAttribute('data-em-foco'));
      });
    };
  });

  mm.add('(max-width: 767px)', () => {
    const observadores: IntersectionObserver[] = [];
    secoes.forEach((secao) => {
      const trilho = secao.querySelector<HTMLElement>('.lineup__trilho');
      const cards = Array.from(secao.querySelectorAll<HTMLElement>('[data-croqui]'));
      if (!trilho || cards.length === 0) return;
      secao.classList.add('lineup--carrossel');
      const io = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) if (e.isIntersecting) focar(cards, e.target as HTMLElement);
        },
        { root: trilho, threshold: 0.6 },
      );
      cards.forEach((c) => io.observe(c));
      observadores.push(io);
    });
    return () => {
      observadores.forEach((o) => o.disconnect());
      secoes.forEach((s) => {
        s.classList.remove('lineup--carrossel');
        s.querySelectorAll('[data-em-foco]').forEach((c) => c.removeAttribute('data-em-foco'));
      });
    };
  });

  return () => mm.revert();
}
```

Em `src/scripts/animacoes/index.ts`, acrescente `import('./lineup'),` à lista do `Promise.all` de módulos, logo depois de `import('./linha'),`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/croquis.spec.ts`
Expected: PASS. Os testes da Task 4 continuam verdes porque usam movimento reduzido, ou seja, a grade.

Run: `npx playwright test`
Expected: suíte inteira verde, incluindo `animacoes.spec.ts`.

- [ ] **Step 5: Conferência visual**

Screenshots a 1440×900 em três pontos da rolagem do desfile (início, meio e fim), e no celular (412px) com o carrossel deslizado até o meio. Confira com Read:
- o look em foco é o central, maior, com rótulo vermelho;
- os outros estão esmaecidos;
- nada fica cortado no topo da seção presa.

Ajuste a altura do palco no desfile (`58vh`) se o rótulo ou a paleta saírem da tela em 1280×720, e registre como ruling.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/animacoes/lineup.ts src/scripts/animacoes/index.ts tests/e2e/croquis.spec.ts
git commit -m "feat: line-up de croquis que desfila na rolagem e carrossel no celular

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Bloco na capa, varredura de qualidade e guia de conteúdo

**Files:**
- Modify: `src/pages/index.astro` (bloco "Prancha de croquis"), `tests/e2e/qualidade.spec.ts` (`ROTAS`), `tests/e2e/compartilhamento.spec.ts` (rotas), `tests/e2e/capa.spec.ts` (novo teste), `docs/como-editar-conteudo.md`

**Interfaces:**
- Consumes: collection `croquis` (Task 3); página `/croquis` (Task 4).
- Produces: `section.prancha` na capa, com 5 `[data-croqui-mini]` e links para `/croquis`.

- [ ] **Step 1: Escrever os testes (falhando)**

Acrescente ao final de `tests/e2e/capa.spec.ts`:
```ts
test('capa mostra a prancha de croquis com link para a página', async ({ page }) => {
  await page.goto('/');
  const prancha = page.locator('section.prancha');
  await expect(prancha.locator('[data-croqui-mini]')).toHaveCount(5);
  await expect(prancha.getByRole('link', { name: 'Ver a prancha completa →' })).toHaveAttribute('href', '/croquis');
});
```
Em `tests/e2e/qualidade.spec.ts`, acrescente `'/croquis',` ao fim do array `ROTAS`. Em `tests/e2e/compartilhamento.spec.ts`, troque o array de rotas por `['/', '/pecas/vestido-aurora', '/sobre', '/croquis']`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/capa.spec.ts tests/e2e/qualidade.spec.ts tests/e2e/compartilhamento.spec.ts`
Expected: FAIL no teste da prancha (seção ausente). Os testes de `/croquis` em qualidade e compartilhamento podem já passar, porque são guardas da página feita na Task 4. Se algum falhar (contraste, rolagem horizontal, prévia), corrija a causa no componente.

- [ ] **Step 3: Implementar o bloco na capa**

Em `src/pages/index.astro`:
- no frontmatter, junto aos outros cálculos, acrescente:
```ts
const minis = (await getCollection('croquis')).sort((a, b) => a.data.ordem - b.data.ordem).slice(0, 5);
```
- logo depois do bloco `{destaques.length > 0 && (...)}`, acrescente:
```astro
  {minis.length > 0 && (
    <section class="container prancha" aria-labelledby="t-prancha">
      <p class="kicker">Prancha de croquis</p>
      <h2 id="t-prancha" data-anim="revelar">Do papel para a passarela</h2>
      <a class="prancha__fila" href="/croquis" aria-label="Abrir a prancha de croquis">
        {minis.map((m) => (
          <Image
            data-croqui-mini
            src={m.data.imagem}
            alt=""
            widths={[160, 240, 320]}
            sizes="(min-width: 768px) 16vw, 18vw"
          />
        ))}
      </a>
      <a class="botao" href="/croquis">Ver a prancha completa →</a>
    </section>
  )}
```
- no `<style>` da página, acrescente:
```css
  .prancha { padding-block: 3rem; border-top: 2px solid var(--tinta); }
  .prancha h2 { margin-block: 0.5rem 2rem; font-style: italic; }
  .prancha__fila { display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(0.5rem, 2vw, 2rem); align-items: end; margin-bottom: 2rem; }
  .prancha__fila :global(img) { width: 100%; height: auto; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
  .prancha__fila:hover :global(img) { transform: translateY(-6px); }
  .prancha__fila:hover :global(img:nth-child(even)) { transform: translateY(6px); }
```

- [ ] **Step 4: Atualizar o guia de conteúdo**

Em `docs/como-editar-conteudo.md`, antes de "## Antes de publicar", acrescente:
````md
## Croquis e paletas
Cada croqui fica em `src/content/croquis/look-NN/` com `croqui.jpeg` e um `index.md`:
```md
---
titulo: Look 10
ordem: 10
imagem: ./croqui.jpeg
alt: Descrição do desenho para quem não enxerga.
---
```
1. Use nomes de arquivo em minúsculas (`croqui.jpeg`) e fotos em JPG/PNG; HEIC precisa ser convertido.
2. Rode `npm run paletas`. O script sugere de 3 a 4 cores da roupa (ignora fundo e pele), grava em `paleta:` no `index.md` e gera as máscaras `mascara-*.png` do efeito de destaque.
3. Não gostou de uma cor? Edite `paleta:` à mão (hex **entre aspas**, ex.: `"#bf343a"`) e rode `npm run paletas` de novo: sua paleta é mantida e só as máscaras são refeitas.
4. Se esquecer de rodar o script, o build avisa qual look e qual cor precisam dele.
````

- [ ] **Step 5: Rodar tudo**

Run: `npm run build && npm test && npx playwright test`
Expected: `astro check` com 0 erros, build concluído, todos os testes unitários e e2e verdes.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/e2e/capa.spec.ts tests/e2e/qualidade.spec.ts tests/e2e/compartilhamento.spec.ts docs/como-editar-conteudo.md
git commit -m "feat: prancha de croquis na capa, varredura de qualidade e guia de paletas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
