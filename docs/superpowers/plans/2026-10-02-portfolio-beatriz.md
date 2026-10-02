# Portfólio da Beatriz — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a v1 do portfólio da Beatriz (modelista), um site estático em formato de "revista editorial pop" que funciona como vitrine e currículo.

**Architecture:** O site é feito em Astro 5, estático. O conteúdo fica em content collections (Markdown + fotos, validados com Zod), e o código é dividido em componentes `.astro` com uma responsabilidade cada. A lógica pura fica em `src/lib/*.ts`, com testes unitários. As animações GSAP ficam isoladas em `src/scripts/animacoes/` e são ativadas por atributos `data-anim`, sempre partindo do estado final em CSS (`gsap.from`), então o site funciona sem JS e com movimento reduzido. As transições entre páginas usam o `ClientRouter` do Astro.

**Tech Stack:** Astro 5.18.2, GSAP 3.15 (+ScrollTrigger), TypeScript 5.9, Vitest 3.2 (unitário), Playwright 1.63 (e2e), @axe-core/playwright (acessibilidade) e sharp (gerador de imagens provisórias).

**Spec:** `docs/superpowers/specs/2026-10-02-portfolio-beatriz-design.md`

## Global Constraints

- Astro **fixado em `5.18.2`**. Existe o Astro 7, mas este plano usa as APIs do 5: `src/content.config.ts`, `glob()` loader, `reference()`, `render()`, `ClientRouter` de `astro:transitions`. Não atualizar a versão.
- Node ≥ 20 (a máquina tem Node 24).
- Idioma único: português. `<html lang="pt-BR">`. Todo texto visível e as mensagens de teste ficam em português.
- Paleta (tokens exatos): papel `#f6efe4`, tinta `#141414`, rosa `#ff2e88`, vermelho `#e10600`, cobalto `#0047ab`, amarelo `#ffd400`.
- Tipografia: **Bodoni Moda** (display, serifa Didone) e **Inter** (texto), via Google Fonts.
- Breakpoint único: `768px` (mobile-first; acima disso é desktop).
- Toda imagem de conteúdo tem `alt` obrigatório no schema. Contraste WCAG AA. Navegação por teclado com `:focus-visible` visível.
- `prefers-reduced-motion: reduce` desliga GSAP e as transições de página.
- Fora do escopo: CMS, formulário de contato, inglês, deploy e domínio.
- O gerador de placeholders **nunca sobrescreve** um arquivo existente (fotos reais da Beatriz).
- Meta: Lighthouse ≥ 90 em performance e acessibilidade.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Desvios conscientes da spec (detalhes de implementação)
- O config das collections fica em `src/content.config.ts` (convenção do Astro 5), não em `src/content/config.ts`.
- `sobre.md` fica em `src/content/sobre/sobre.md`, para o retrato ficar ao lado do arquivo.
- Há um componente extra, `CardPeca`, e uma pasta `src/lib/` para lógica pura testável.
- O "pin" do Processo é feito com `position: sticky` em CSS (funciona sem JS). O GSAP adiciona zoom e fade com scrub por cima.
- As animações incluem também o módulo `linha.ts`, que desenha a linha do tempo.

## Review Focus

1. **Visitante com movimento reduzido** (`prefers-reduced-motion: reduce`): todo o conteúdo aparece com opacidade 1 e nenhuma animação roda. Teste na Task 10.
2. **Navegar e voltar** (ClientRouter, botão voltar): as animações reiniciam, os ScrollTriggers não se acumulam, nada fica preso invisível e não há erro no console. Teste na Task 10.
3. **Celular estreito** (projeto Playwright "mobile" = Pixel 7, 412px; conferir também 375px no DevTools) com o nome gigante da capa e títulos longos: sem rolagem horizontal. Testes nas Tasks 5 e 11 (todas as rotas); conferência manual a 375px na Task 5, Step 5.
4. **Peça sem galeria e sem processo / coleção sem peças:** nenhuma seção vazia ou quebrada aparece. Testes na Task 7 (e2e, `macacao-ponte`) e na Task 2 (`pecaDeCapa([])`).
5. **Rodar o gerador de placeholders depois de colocar fotos reais:** as fotos reais não podem ser sobrescritas. Teste na Task 3.

---

## Mapa de arquivos

```
astro.config.mjs, tsconfig.json, package.json, vitest.config.ts, playwright.config.ts, .gitignore
public/favicon.svg, public/cv-beatriz.pdf (gerado)
scripts/gerar-placeholders.mjs          → imagens/PDF provisórios (nunca sobrescreve)
src/content.config.ts                   → schemas: colecoes, pecas, sobre
src/content/colecoes/*.md
src/content/pecas/<slug>/index.md + fotos
src/content/sobre/sobre.md + retrato.jpg
src/data/site.json                      → nome, edição, contatos, chamadas de capa
src/assets/og-padrao.jpg (gerado)
src/lib/cor.ts                          → contraste de texto sobre cor
src/lib/colecoes.ts                     → ordenação/filtro de coleções e peças
src/lib/trajetoria.ts                   → ordenação e formatação da linha do tempo
src/lib/contato.ts                      → links de WhatsApp/Instagram
src/lib/processo.ts                     → etapas do processo em ordem
src/styles/tokens.css, src/styles/global.css
src/layouts/Revista.astro
src/components/Navegacao, Expediente, CardPeca, CardColecao, FichaTecnica,
               GaleriaPeca, ProcessoScroll, LinhaDoTempo (.astro)
src/pages/index, colecoes/index, colecoes/[slug], pecas/[slug], processo, sobre (.astro)
src/scripts/virada.ts                   → animação de transição de página
src/scripts/animacoes/index.ts, capa.ts, revelar.ts, parallax.ts, processo.ts, linha.ts
tests/unit/*.test.ts, tests/e2e/*.spec.ts, tests/e2e/utils.ts
docs/como-editar-conteudo.md
```

---

### Task 1: Esqueleto do projeto, ferramentas e layout base

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `public/favicon.svg`, `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Revista.astro`, `src/pages/index.astro`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: layout `Revista.astro` com a prop `titulo: string` (vira opcional na Task 4); classes globais `.container`, `.kicker`, `.sr-only`, `.botao`, `.pular`; variáveis CSS `--papel --tinta --rosa --vermelho --cobalto --amarelo --fonte-display --fonte-texto --gutter --max`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "portfolio-beatriz",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "placeholders": "node scripts/gerar-placeholders.mjs"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install astro@5.18.2 gsap@3.15.0
npm install -D @astrojs/check@0.9.10 typescript@5.9.3 vitest@3.2.7 @playwright/test@1.63.0 sharp@0.35.5
npx playwright install chromium
```

- [ ] **Step 3: Criar os arquivos de configuração**

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';

// Troque pela URL real quando o site for publicado (usada nas prévias de link).
export default defineConfig({
  site: 'https://portfolio-beatriz.netlify.app',
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'] },
});
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  webServer: {
    command: 'npx astro build && npx astro preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: 'http://127.0.0.1:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

`.gitignore`:
```
node_modules/
dist/
.astro/
test-results/
playwright-report/
lighthouse-*.json
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ff2e88"/><text x="32" y="47" font-family="Didot, Bodoni MT, serif" font-size="44" font-weight="700" text-anchor="middle" fill="#141414">B</text></svg>
```

- [ ] **Step 4: Escrever o teste de fumaça (falhando)**

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('a home responde em pt-BR com o nome da Beatriz', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Beatriz');
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/smoke.spec.ts`
Expected: FAIL. O build não encontra páginas (`src/pages` não existe) ou o heading não é encontrado.

- [ ] **Step 6: Criar tokens, CSS global, layout e página inicial provisória**

`src/styles/tokens.css`:
```css
:root {
  --papel: #f6efe4;
  --tinta: #141414;
  --rosa: #ff2e88;
  --vermelho: #e10600;
  --cobalto: #0047ab;
  --amarelo: #ffd400;
  --fonte-display: 'Bodoni Moda', 'Didot', 'Bodoni MT', serif;
  --fonte-texto: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --gutter: clamp(16px, 4vw, 48px);
  --max: 1280px;
}
```

`src/styles/global.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--fonte-texto);
  font-size: 1.0625rem;
  line-height: 1.6;
}
img { display: block; max-width: 100%; height: auto; }
a { color: inherit; }
h1, h2, h3 {
  font-family: var(--fonte-display);
  font-weight: 700;
  line-height: 1;
  margin: 0;
  overflow-wrap: break-word;
}
h1 { font-size: clamp(2.75rem, 9vw, 7rem); letter-spacing: -0.02em; }
h2 { font-size: clamp(2rem, 5vw, 3.5rem); }
h3 { font-size: clamp(1.4rem, 2.5vw, 2rem); }
.container { width: min(100% - 2 * var(--gutter), var(--max)); margin-inline: auto; }
.kicker {
  font-family: var(--fonte-texto);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0;
}
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
:focus-visible { outline: 3px solid var(--cobalto); outline-offset: 3px; }
.pular { position: absolute; left: -9999px; }
.pular:focus { left: 16px; top: 16px; z-index: 100; background: var(--tinta); color: var(--papel); padding: 0.5rem 1rem; }
.botao {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.9rem 1.4rem;
  background: var(--tinta); color: var(--papel);
  border: 2px solid var(--tinta);
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.botao:hover { background: var(--rosa); color: var(--tinta); }
```

`src/layouts/Revista.astro`:
```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import { ClientRouter } from 'astro:transitions';

interface Props {
  titulo: string;
}
const { titulo } = Astro.props;
---
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{titulo}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Inter:wght@400;500;700&display=swap"
    />
    <ClientRouter />
  </head>
  <body>
    <a class="pular" href="#conteudo">Pular para o conteúdo</a>
    <main id="conteudo">
      <slot />
    </main>
  </body>
</html>
```

`src/pages/index.astro` (provisória, será substituída na Task 5):
```astro
---
import Revista from '../layouts/Revista.astro';
---
<Revista titulo="Beatriz">
  <h1 class="container">Beatriz</h1>
</Revista>
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx astro sync && npx playwright test tests/e2e/smoke.spec.ts`
Expected: PASS (2 testes: desktop e mobile).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: esqueleto Astro com layout base, tokens e testes e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lógica pura (cores, coleções, trajetória, contato, processo)

**Files:**
- Create: `src/lib/cor.ts`, `src/lib/colecoes.ts`, `src/lib/trajetoria.ts`, `src/lib/contato.ts`, `src/lib/processo.ts`
- Test: `tests/unit/cor.test.ts`, `tests/unit/colecoes.test.ts`, `tests/unit/trajetoria.test.ts`, `tests/unit/contato.test.ts`, `tests/unit/processo.test.ts`

**Interfaces:**
- Produces:
  - `corDeTextoSobre(hex: string): '#141414' | '#ffffff'`
  - `ordenarColecoes<T extends { data: { ordem: number } }>(c: T[]): T[]`
  - `porRecencia(a: PecaLike, b: PecaLike): number`
  - `pecasDaColecao<T extends PecaLike>(pecas: T[], colecaoId: string): T[]`
  - `pecaDeCapa<T extends PecaLike>(pecas: T[]): T | undefined`
  - `PecaLike = { id: string; data: { titulo: string; ano: number; destaque: boolean; colecao: { id: string } } }`
  - `ItemTrajetoria = { inicio: number; fim: number | null; tipo: 'formacao' | 'experiencia'; titulo: string; local: string; descricao?: string }`
  - `ordenarTrajetoria<T extends ItemTrajetoria>(itens: T[]): T[]`, `formatarPeriodo(inicio: number, fim: number | null): string`
  - `linkWhatsApp(telefone: string, mensagem?: string): string` (lança `Error` se o número for inválido), `linkInstagram(usuario: string): string`
  - `ORDEM_ETAPAS`, `ROTULOS_ETAPAS`, `ChaveEtapa`, `etapasEmOrdem<T extends object>(p: Record<ChaveEtapa, T>): Array<T & { chave: ChaveEtapa; numero: string; rotulo: string }>`

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/unit/cor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { corDeTextoSobre } from '../../src/lib/cor';

describe('corDeTextoSobre', () => {
  it('usa texto escuro sobre cores claras/vibrantes', () => {
    expect(corDeTextoSobre('#ffd400')).toBe('#141414');
    expect(corDeTextoSobre('#ff2e88')).toBe('#141414');
    expect(corDeTextoSobre('#f6efe4')).toBe('#141414');
  });
  it('usa texto branco sobre cores escuras', () => {
    expect(corDeTextoSobre('#0047ab')).toBe('#ffffff');
    expect(corDeTextoSobre('#e10600')).toBe('#ffffff');
    expect(corDeTextoSobre('#141414')).toBe('#ffffff');
  });
  it('aceita maiúsculas', () => {
    expect(corDeTextoSobre('#0047AB')).toBe('#ffffff');
  });
});
```

`tests/unit/colecoes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ordenarColecoes, pecasDaColecao, pecaDeCapa } from '../../src/lib/colecoes';

const peca = (id: string, colecao: string, ano: number, destaque = false) => ({
  id,
  data: { titulo: id, ano, destaque, colecao: { id: colecao } },
});

describe('ordenarColecoes', () => {
  it('ordena pelo campo ordem sem alterar o array original', () => {
    const original = [{ id: 'b', data: { ordem: 2 } }, { id: 'a', data: { ordem: 1 } }];
    expect(ordenarColecoes(original).map((c) => c.id)).toEqual(['a', 'b']);
    expect(original[0].id).toBe('b');
  });
});

describe('pecasDaColecao', () => {
  it('filtra pela coleção e ordena da mais recente para a mais antiga, empatando pelo título', () => {
    const pecas = [
      peca('saia', 'aurora', 2025),
      peca('blazer', 'concreto', 2026),
      peca('vestido', 'aurora', 2026),
      peca('blusa', 'aurora', 2025),
    ];
    expect(pecasDaColecao(pecas, 'aurora').map((p) => p.id)).toEqual(['vestido', 'blusa', 'saia']);
  });
  it('retorna lista vazia para coleção sem peças', () => {
    expect(pecasDaColecao([peca('x', 'aurora', 2026)], 'concreto')).toEqual([]);
  });
});

describe('pecaDeCapa', () => {
  it('prefere a peça marcada como destaque', () => {
    const pecas = [peca('nova', 'a', 2026), peca('estrela', 'a', 2024, true)];
    expect(pecaDeCapa(pecas)?.id).toBe('estrela');
  });
  it('sem destaque, usa a mais recente', () => {
    expect(pecaDeCapa([peca('velha', 'a', 2020), peca('nova', 'a', 2026)])?.id).toBe('nova');
  });
  it('lista vazia retorna undefined', () => {
    expect(pecaDeCapa([])).toBeUndefined();
  });
});
```

`tests/unit/trajetoria.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ordenarTrajetoria, formatarPeriodo, type ItemTrajetoria } from '../../src/lib/trajetoria';

const item = (titulo: string, inicio: number, fim: number | null): ItemTrajetoria => ({
  titulo, inicio, fim, tipo: 'experiencia', local: 'X',
});

describe('ordenarTrajetoria', () => {
  it('coloca o atual primeiro e depois pelo fim mais recente', () => {
    const itens = [item('curso', 2019, 2022), item('atual', 2024, null), item('estagio', 2022, 2024), item('oficina', 2023, 2023)];
    expect(ordenarTrajetoria(itens).map((i) => i.titulo)).toEqual(['atual', 'estagio', 'oficina', 'curso']);
  });
  it('empate no fim desempata pelo início mais recente', () => {
    const itens = [item('longo', 2018, 2024), item('curto', 2023, 2024)];
    expect(ordenarTrajetoria(itens).map((i) => i.titulo)).toEqual(['curto', 'longo']);
  });
});

describe('formatarPeriodo', () => {
  it('formata período em andamento', () => expect(formatarPeriodo(2024, null)).toBe('2024 — atual'));
  it('formata período fechado', () => expect(formatarPeriodo(2019, 2022)).toBe('2019 — 2022'));
  it('formata período de um ano só', () => expect(formatarPeriodo(2023, 2023)).toBe('2023'));
});
```

`tests/unit/contato.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { linkWhatsApp, linkInstagram } from '../../src/lib/contato';

describe('linkWhatsApp', () => {
  it('aceita número com máscara brasileira e adiciona o 55', () => {
    expect(linkWhatsApp('(11) 98765-4321')).toBe('https://wa.me/5511987654321');
  });
  it('aceita número já com +55 e espaços', () => {
    expect(linkWhatsApp('+55 11 98765-4321')).toBe('https://wa.me/5511987654321');
  });
  it('aceita fixo de 10 dígitos', () => {
    expect(linkWhatsApp('11 3456-7890')).toBe('https://wa.me/551134567890');
  });
  it('codifica a mensagem', () => {
    expect(linkWhatsApp('11987654321', 'Olá, Beatriz!')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Beatriz!',
    );
  });
  it('recusa número curto demais com mensagem clara', () => {
    expect(() => linkWhatsApp('123')).toThrow('Telefone inválido para WhatsApp: "123"');
  });
});

describe('linkInstagram', () => {
  it('remove o @ do usuário', () => {
    expect(linkInstagram('@beatriz.modelista')).toBe('https://instagram.com/beatriz.modelista');
  });
  it('funciona sem @', () => {
    expect(linkInstagram('beatriz.modelista')).toBe('https://instagram.com/beatriz.modelista');
  });
});
```

`tests/unit/processo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { etapasEmOrdem } from '../../src/lib/processo';

describe('etapasEmOrdem', () => {
  it('retorna as 4 etapas na ordem do ateliê, com número e rótulo', () => {
    const etapas = etapasEmOrdem({
      final: { texto: 'd' }, costura: { texto: 'c' }, croqui: { texto: 'a' }, molde: { texto: 'b' },
    });
    expect(etapas.map((e) => [e.numero, e.rotulo, e.texto])).toEqual([
      ['01', 'Croqui', 'a'],
      ['02', 'Molde', 'b'],
      ['03', 'Corte e costura', 'c'],
      ['04', 'Peça pronta', 'd'],
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL, com "Failed to resolve import ../../src/lib/..." nos 5 arquivos.

- [ ] **Step 3: Implementar**

`src/lib/cor.ts`:
```ts
const TINTA = '#141414';
const BRANCO = '#ffffff';

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => canal(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Escolhe a cor de texto (tinta ou branco) com mais contraste sobre o fundo informado. */
export function corDeTextoSobre(hex: string): typeof TINTA | typeof BRANCO {
  return contraste(hex, TINTA) >= contraste(hex, BRANCO) ? TINTA : BRANCO;
}
```

`src/lib/colecoes.ts`:
```ts
export interface PecaLike {
  id: string;
  data: { titulo: string; ano: number; destaque: boolean; colecao: { id: string } };
}

export function ordenarColecoes<T extends { data: { ordem: number } }>(colecoes: T[]): T[] {
  return [...colecoes].sort((a, b) => a.data.ordem - b.data.ordem);
}

export function porRecencia(a: PecaLike, b: PecaLike): number {
  return b.data.ano - a.data.ano || a.data.titulo.localeCompare(b.data.titulo, 'pt-BR');
}

export function pecasDaColecao<T extends PecaLike>(pecas: T[], colecaoId: string): T[] {
  return pecas.filter((p) => p.data.colecao.id === colecaoId).sort(porRecencia);
}

/** Peça que estampa uma capa: a marcada como destaque ou, na falta dela, a mais recente. */
export function pecaDeCapa<T extends PecaLike>(pecas: T[]): T | undefined {
  return pecas.find((p) => p.data.destaque) ?? [...pecas].sort(porRecencia)[0];
}
```

`src/lib/trajetoria.ts`:
```ts
export interface ItemTrajetoria {
  inicio: number;
  fim: number | null;
  tipo: 'formacao' | 'experiencia';
  titulo: string;
  local: string;
  descricao?: string;
}

/** Mais recente primeiro: o que está em andamento (fim null) vem antes de tudo. */
export function ordenarTrajetoria<T extends ItemTrajetoria>(itens: T[]): T[] {
  const fim = (i: ItemTrajetoria) => i.fim ?? Number.POSITIVE_INFINITY;
  return [...itens].sort((a, b) => {
    if (fim(a) !== fim(b)) return fim(b) - fim(a);
    return b.inicio - a.inicio;
  });
}

export function formatarPeriodo(inicio: number, fim: number | null): string {
  if (fim === null) return `${inicio} — atual`;
  if (fim === inicio) return String(inicio);
  return `${inicio} — ${fim}`;
}
```

`src/lib/contato.ts`:
```ts
/** Monta o link wa.me a partir de um telefone brasileiro digitado de qualquer jeito. */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  let digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 13) {
    throw new Error(`Telefone inválido para WhatsApp: "${telefone}"`);
  }
  const url = `https://wa.me/${digitos}`;
  return mensagem ? `${url}?text=${encodeURIComponent(mensagem)}` : url;
}

export function linkInstagram(usuario: string): string {
  return `https://instagram.com/${usuario.trim().replace(/^@/, '')}`;
}
```

`src/lib/processo.ts`:
```ts
export const ROTULOS_ETAPAS = {
  croqui: 'Croqui',
  molde: 'Molde',
  costura: 'Corte e costura',
  final: 'Peça pronta',
} as const;

export type ChaveEtapa = keyof typeof ROTULOS_ETAPAS;

export const ORDEM_ETAPAS: ChaveEtapa[] = ['croqui', 'molde', 'costura', 'final'];

export function etapasEmOrdem<T extends object>(processo: Record<ChaveEtapa, T>) {
  return ORDEM_ETAPAS.map((chave, i) => ({
    ...processo[chave],
    chave,
    numero: String(i + 1).padStart(2, '0'),
    rotulo: ROTULOS_ETAPAS[chave] as string,
  }));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (5 arquivos, todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: lógica pura de cores, coleções, trajetória, contato e processo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schemas de conteúdo, gerador de placeholders e conteúdo de exemplo

**Files:**
- Create: `scripts/gerar-placeholders.mjs`, `src/content.config.ts`, `src/content/colecoes/aurora.md`, `src/content/colecoes/concreto.md`, `src/content/pecas/{vestido-aurora,blusa-alvorada,saia-orvalho,blazer-concreto,calca-viga,macacao-ponte}/index.md`, `src/content/sobre/sobre.md`
- Generated (commitados): fotos `.jpg` nas pastas acima, `src/content/sobre/retrato.jpg`, `src/assets/og-padrao.jpg`, `public/cv-beatriz.pdf`
- Test: `tests/unit/placeholders.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: collections `colecoes` (`nome, cor, ordem, ano, resumo`, com corpo em markdown), `pecas` (`titulo, colecao: reference, ano, tecido, tecnica, destaque, capa, capaAlt, galeria[{src, alt}], processo?: {croqui, molde, costura, final: {imagem, alt, texto}}`, com corpo em markdown) e `sobre` (id `sobre`: `nome, cargo, cidade, retrato, retratoAlt, entrevista[{pergunta, resposta}], trajetoria[ItemTrajetoria], habilidades[]`, com corpo em markdown). IDs das peças = nome da pasta. Arquivo `src/assets/og-padrao.jpg`.
- `gerarImagem(caminho, { largura, altura, cor, rotulo }): Promise<boolean>` (`false` quando já existe) e `montarPdf(linhas: string[]): Buffer`.

- [ ] **Step 1: Escrever o teste do gerador (falhando)**

`tests/unit/placeholders.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gerarImagem, montarPdf } from '../../scripts/gerar-placeholders.mjs';

const opcoes = { largura: 40, altura: 60, cor: '#ff2e88', rotulo: 'A & B' };

describe('gerarImagem', () => {
  it('cria um JPG (criando pastas) quando o arquivo não existe', async () => {
    const caminho = join(mkdtempSync(join(tmpdir(), 'ph-')), 'sub', 'a.jpg');
    expect(await gerarImagem(caminho, opcoes)).toBe(true);
    const bytes = readFileSync(caminho);
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
  });

  it('nunca sobrescreve uma foto que já existe', async () => {
    const caminho = join(mkdtempSync(join(tmpdir(), 'ph-')), 'real.jpg');
    writeFileSync(caminho, 'foto real da Beatriz');
    expect(await gerarImagem(caminho, opcoes)).toBe(false);
    expect(readFileSync(caminho, 'utf8')).toBe('foto real da Beatriz');
  });
});

describe('montarPdf', () => {
  it('gera um PDF válido com a tabela xref no lugar certo', () => {
    const pdf = montarPdf(['Beatriz', 'Modelista (provisório)']).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    const inicioXref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(inicioXref, inicioXref + 4)).toBe('xref');
    expect(pdf).toContain('(Modelista \\(provis\xf3rio\\))');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/placeholders.test.ts`
Expected: FAIL, com "Failed to resolve import ../../scripts/gerar-placeholders.mjs".

- [ ] **Step 3: Implementar o gerador**

`scripts/gerar-placeholders.mjs`:
```js
// Gera imagens e PDF provisórios para o site rodar antes das fotos reais.
// Regra de ouro: NUNCA sobrescreve um arquivo existente.
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const escaparXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @returns {Promise<boolean>} true se criou; false se o arquivo já existia. */
export async function gerarImagem(caminho, { largura, altura, cor, rotulo }) {
  if (existsSync(caminho)) return false;
  mkdirSync(dirname(caminho), { recursive: true });
  const tamanho = Math.max(10, Math.round(largura / 14));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect width="100%" height="100%" fill="${cor}"/>
  <text x="50%" y="50%" font-family="Georgia, serif" font-size="${tamanho}" fill="#141414"
    text-anchor="middle" dominant-baseline="middle">${escaparXml(rotulo)}</text>
</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(caminho);
  return true;
}

/** PDF de uma página com linhas de texto (Helvetica, WinAnsi para acentos). */
export function montarPdf(linhas) {
  const esc = (s) => s.replace(/[\\()]/g, (m) => `\\${m}`);
  const conteudo = ['BT', '/F1 16 Tf', '72 740 Td', '24 TL', ...linhas.map((l) => `(${esc(l)}) '`), 'ET'].join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const PECAS = [
  { slug: 'vestido-aurora', cor: '#ff8fc0', galeria: 3, processo: true },
  { slug: 'blusa-alvorada', cor: '#ffb3d4', galeria: 2 },
  { slug: 'saia-orvalho', cor: '#ff6fa8', galeria: 1 },
  { slug: 'blazer-concreto', cor: '#7da2e0', galeria: 2 },
  { slug: 'calca-viga', cor: '#9fb8e8', galeria: 1 },
  { slug: 'macacao-ponte', cor: '#5f8bd6', galeria: 0 },
];

async function main() {
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  let criados = 0;
  const criar = async (relativo, opcoes) => {
    if (await gerarImagem(join(raiz, relativo), opcoes)) {
      criados++;
      console.log(`  + ${relativo}`);
    }
  };

  for (const p of PECAS) {
    const pasta = `src/content/pecas/${p.slug}`;
    await criar(`${pasta}/capa.jpg`, { largura: 1200, altura: 1600, cor: p.cor, rotulo: `${p.slug} · capa` });
    for (let i = 1; i <= p.galeria; i++) {
      const nome = String(i).padStart(2, '0');
      await criar(`${pasta}/${nome}.jpg`, { largura: 1200, altura: 1500, cor: p.cor, rotulo: `${p.slug} · ${nome}` });
    }
    if (p.processo) {
      for (const etapa of ['croqui', 'molde', 'costura', 'final']) {
        await criar(`${pasta}/${etapa}.jpg`, { largura: 1200, altura: 1500, cor: p.cor, rotulo: `${p.slug} · ${etapa}` });
      }
    }
  }
  await criar('src/content/sobre/retrato.jpg', { largura: 1000, altura: 1250, cor: '#ffd400', rotulo: 'retrato da Beatriz' });
  await criar('src/assets/og-padrao.jpg', { largura: 1200, altura: 630, cor: '#ff2e88', rotulo: 'BEATRIZ · modelista' });

  const cv = join(raiz, 'public/cv-beatriz.pdf');
  if (!existsSync(cv)) {
    mkdirSync(dirname(cv), { recursive: true });
    writeFileSync(cv, montarPdf(['Beatriz - Modelista', 'Currículo provisório.', 'Substitua public/cv-beatriz.pdf pelo CV real.']));
    criados++;
    console.log('  + public/cv-beatriz.pdf');
  }
  console.log(criados ? `${criados} arquivo(s) provisório(s) criado(s).` : 'Nada a fazer: todos os arquivos já existem.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
```

- [ ] **Step 4: Rodar os testes do gerador e ver passar**

Run: `npx vitest run tests/unit/placeholders.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Criar o schema das collections**

`src/content.config.ts`:
```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const corHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use cor hex de 6 dígitos entre aspas, ex.: "#ff2e88"');

const colecoes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/colecoes' }),
  schema: z.object({
    nome: z.string(),
    cor: corHex,
    ordem: z.number().int(),
    ano: z.number().int(),
    resumo: z.string(),
  }),
});

const pecas = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/pecas' }),
  schema: ({ image }) => {
    const etapa = z.object({ imagem: image(), alt: z.string().min(1), texto: z.string().min(1) });
    return z.object({
      titulo: z.string(),
      colecao: reference('colecoes'),
      ano: z.number().int(),
      tecido: z.string(),
      tecnica: z.string(),
      destaque: z.boolean().default(false),
      capa: image(),
      capaAlt: z.string().min(1, 'Descreva a foto de capa (texto alternativo)'),
      galeria: z.array(z.object({ src: image(), alt: z.string().min(1) })).default([]),
      processo: z.object({ croqui: etapa, molde: etapa, costura: etapa, final: etapa }).optional(),
    });
  },
});

const sobre = defineCollection({
  loader: glob({ pattern: 'sobre.md', base: './src/content/sobre' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      cargo: z.string(),
      cidade: z.string(),
      retrato: image(),
      retratoAlt: z.string().min(1),
      entrevista: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).min(1),
      trajetoria: z.array(
        z
          .object({
            inicio: z.number().int(),
            fim: z.number().int().nullable(),
            tipo: z.enum(['formacao', 'experiencia']),
            titulo: z.string(),
            local: z.string(),
            descricao: z.string().optional(),
          })
          .refine((i) => i.fim === null || i.fim >= i.inicio, 'O ano de fim não pode ser antes do início'),
      ),
      habilidades: z.array(z.string()).min(1),
    }),
});

export const collections = { colecoes, pecas, sobre };
```

- [ ] **Step 6: Criar o conteúdo de exemplo**

`src/content/colecoes/aurora.md`:
```md
---
nome: Aurora
cor: "#ff2e88"
ordem: 1
ano: 2026
resumo: Drapeados leves e tons de amanhecer para quem acorda cedo para sonhar.
---
Texto provisório. Aurora nasceu de cadernos de croquis cheios de rosa e vermelho: peças fluidas, modeladas direto no manequim, que se movem como luz da manhã.
```

`src/content/colecoes/concreto.md`:
```md
---
nome: Concreto
cor: "#0047ab"
ordem: 2
ano: 2025
resumo: Alfaiataria de linhas retas inspirada na arquitetura brutalista.
---
Texto provisório. Concreto investiga estrutura: entretelas, pregas profundas e recortes geométricos que constroem a silhueta como um edifício.
```

`src/content/pecas/vestido-aurora/index.md`:
```md
---
titulo: Vestido Aurora
colecao: aurora
ano: 2026
tecido: Crepe de seda
tecnica: Moulage e drapeado
destaque: true
capa: ./capa.jpg
capaAlt: Vestido longo rosa com drapeado no ombro, fotografado de corpo inteiro.
galeria:
  - src: ./01.jpg
    alt: Detalhe do drapeado no ombro esquerdo.
  - src: ./02.jpg
    alt: Costas do vestido com decote em V.
  - src: ./03.jpg
    alt: Movimento da saia durante a caminhada.
processo:
  croqui:
    imagem: ./croqui.jpg
    alt: Croqui em aquarela do vestido.
    texto: Tudo começou com um esboço em aquarela, buscando o movimento do tecido ao amanhecer.
  molde:
    imagem: ./molde.jpg
    alt: Molde do corpete em papel kraft com marcações de pence.
    texto: O drapeado foi estudado no manequim e depois transferido para o papel, com cada pence medida à mão.
  costura:
    imagem: ./costura.jpg
    alt: Mãos costurando a barra do vestido.
    texto: Corte em viés para o crepe cair macio; costuras francesas para um acabamento limpo por dentro.
  final:
    imagem: ./final.jpg
    alt: Vestido pronto no manequim.
    texto: O resultado é uma peça que parece leve como um rascunho, mas tem engenharia em cada dobra.
---
Texto provisório da matéria. Aqui a Beatriz conta a história da peça: de onde veio a ideia, os desafios de modelagem e o que a deixa orgulhosa no resultado.
```

`src/content/pecas/blusa-alvorada/index.md`:
```md
---
titulo: Blusa Alvorada
colecao: aurora
ano: 2026
tecido: Linho lavado
tecnica: Modelagem plana com pences deslocadas
capa: ./capa.jpg
capaAlt: Blusa de linho rosa-claro com mangas bufantes.
galeria:
  - src: ./01.jpg
    alt: Detalhe da manga bufante franzida.
  - src: ./02.jpg
    alt: Blusa vista de lado, mostrando a pence deslocada.
---
Texto provisório sobre a Blusa Alvorada.
```

`src/content/pecas/saia-orvalho/index.md`:
```md
---
titulo: Saia Orvalho
colecao: aurora
ano: 2025
tecido: Tule e cetim
tecnica: Godê duplo com forro
capa: ./capa.jpg
capaAlt: Saia midi de tule rosa sobre cetim, em movimento.
galeria:
  - src: ./01.jpg
    alt: Camadas de tule vistas de perto.
---
Texto provisório sobre a Saia Orvalho.
```

`src/content/pecas/blazer-concreto/index.md`:
```md
---
titulo: Blazer Concreto
colecao: concreto
ano: 2025
tecido: Lã fria
tecnica: Alfaiataria com entretela
capa: ./capa.jpg
capaAlt: Blazer azul-cobalto de ombros estruturados.
galeria:
  - src: ./01.jpg
    alt: Lapela em bico com pesponto aparente.
  - src: ./02.jpg
    alt: Forro interno do blazer.
---
Texto provisório sobre o Blazer Concreto.
```

`src/content/pecas/calca-viga/index.md`:
```md
---
titulo: Calça Viga
colecao: concreto
ano: 2025
tecido: Sarja pesada
tecnica: Pregas profundas
capa: ./capa.jpg
capaAlt: Calça pantalona azul com pregas marcadas na cintura.
galeria:
  - src: ./01.jpg
    alt: Detalhe das pregas e do cós.
---
Texto provisório sobre a Calça Viga.
```

`src/content/pecas/macacao-ponte/index.md` (sem galeria e sem processo, de propósito):
```md
---
titulo: Macacão Ponte
colecao: concreto
ano: 2024
tecido: Gabardine
tecnica: Recortes geométricos
capa: ./capa.jpg
capaAlt: Macacão azul com recortes geométricos no busto.
---
Texto provisório sobre o Macacão Ponte.
```

`src/content/sobre/sobre.md`:
```md
---
nome: Beatriz Sobrenome
cargo: Modelista
cidade: São Paulo, SP
retrato: ./retrato.jpg
retratoAlt: Retrato de Beatriz em seu ateliê, entre moldes e tecidos.
entrevista:
  - pergunta: Quando a moda entrou na sua vida?
    resposta: Resposta provisória. A Beatriz conta aqui como começou, quem a inspirou e a primeira peça que costurou.
  - pergunta: O que é ser modelista?
    resposta: Resposta provisória. É transformar um desenho em um molde que funciona num corpo de verdade.
  - pergunta: Qual revista você leria para sempre?
    resposta: Resposta provisória. A Vogue, claro, e o porquê.
trajetoria:
  - inicio: 2024
    fim: null
    tipo: experiencia
    titulo: Modelista
    local: Ateliê Exemplo
    descricao: Modelagem plana e moulage de peças sob medida.
  - inicio: 2022
    fim: 2024
    tipo: experiencia
    titulo: Assistente de modelagem
    local: Confecção Exemplo
  - inicio: 2023
    fim: 2023
    tipo: formacao
    titulo: Curso de Moulage
    local: Escola Exemplo
  - inicio: 2019
    fim: 2022
    tipo: formacao
    titulo: Técnico em Modelagem do Vestuário
    local: Escola Técnica Exemplo
habilidades:
  - Modelagem plana
  - Moulage
  - Graduação de moldes
  - Corte
  - Costura à mão e industrial
  - Ficha técnica
  - Croqui de moda
---
Texto provisório de abertura: duas ou três frases que apresentam a Beatriz como numa revista, com o tom de "conheça a mulher por trás das peças".
```

- [ ] **Step 7: Gerar os placeholders e validar o conteúdo**

Run: `npm run placeholders`
Expected: a lista `+ src/content/pecas/...` e "22 arquivo(s) provisório(s) criado(s)." (6 capas + 9 galerias + 4 processos + retrato + og + cv).

Run de novo: `npm run placeholders`
Expected: "Nada a fazer: todos os arquivos já existem."

Run: `npx astro sync && npx astro check && npx astro build`
Expected: 0 erros e o build conclui.

- [ ] **Step 8: Conferir que o schema barra conteúdo inválido**

Apague temporariamente a linha `capaAlt:` de `src/content/pecas/calca-viga/index.md` e rode `npx astro sync`.
Expected: erro citando `capaAlt` em `calca-viga`. Restaure a linha com `git checkout src/content/pecas/calca-viga/index.md` e rode `npx astro sync` de novo (sem erros).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: schemas de conteúdo, gerador de placeholders e conteúdo de exemplo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Layout completo: navegação, expediente (contato) e metadados de compartilhamento

**Files:**
- Create: `src/data/site.json`, `src/components/Navegacao.astro`, `src/components/Expediente.astro`
- Modify: `src/layouts/Revista.astro` (substituir o arquivo inteiro)
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `linkWhatsApp`, `linkInstagram` (Task 2); `src/assets/og-padrao.jpg` (Task 3).
- Produces: `Revista.astro` com Props `{ titulo?: string; descricao?: string; imagemOg?: ImageMetadata }`. `site.json` com `nome, titulo, descricao, edicao, contatos{whatsapp,email,instagram,mensagemWhatsApp}, chamadas[{texto,href}]`. Footer com `id="expediente"`. Nav com `aria-label="Principal"`.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/layout.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('navegação principal leva às seções', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link', { name: 'Coleções' })).toHaveAttribute('href', '/colecoes');
  await expect(nav.getByRole('link', { name: 'Processo' })).toHaveAttribute('href', '/processo');
  await expect(nav.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre');
  await expect(nav.getByRole('link', { name: 'Contato' })).toHaveAttribute('href', '#expediente');
});

test('expediente traz os contatos clicáveis', async ({ page }) => {
  await page.goto('/');
  const rodape = page.locator('#expediente');
  await expect(rodape.getByRole('link', { name: '(11) 90000-0000' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/5511900000000\?text=/,
  );
  await expect(rodape.getByRole('link', { name: 'beatriz@exemplo.com' })).toHaveAttribute('href', 'mailto:beatriz@exemplo.com');
  await expect(rodape.getByRole('link', { name: '@beatriz.modelista' })).toHaveAttribute(
    'href',
    'https://instagram.com/beatriz.modelista',
  );
});

test('metadados para prévia de link (WhatsApp/redes)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Beatriz · Modelista');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /modelista/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Beatriz · Modelista');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https:\/\/.+\.jpg$/);
  const resposta = await page.request.get(new URL(og!).pathname);
  expect(resposta.ok()).toBe(true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/layout.spec.ts`
Expected: FAIL (a navegação "Principal" não é encontrada).

- [ ] **Step 3: Implementar**

`src/data/site.json`:
```json
{
  "nome": "Beatriz",
  "titulo": "Beatriz · Modelista",
  "descricao": "Portfólio de Beatriz, modelista: croquis, moldes, corte, costura e peças autorais.",
  "edicao": "Edição nº 01 · 2026",
  "contatos": {
    "whatsapp": "(11) 90000-0000",
    "email": "beatriz@exemplo.com",
    "instagram": "@beatriz.modelista",
    "mensagemWhatsApp": "Olá, Beatriz! Vi seu portfólio e gostaria de conversar."
  },
  "chamadas": [
    { "texto": "Do croqui à costura: a anatomia de uma peça", "href": "/processo" },
    { "texto": "As coleções da temporada", "href": "/colecoes" },
    { "texto": "Entrevista exclusiva: quem é a modelista", "href": "/sobre" }
  ]
}
```

`src/components/Navegacao.astro`:
```astro
---
const links = [
  { href: '/colecoes', texto: 'Coleções' },
  { href: '/processo', texto: 'Processo' },
  { href: '/sobre', texto: 'Sobre' },
  { href: '#expediente', texto: 'Contato' },
];
const atual = Astro.url.pathname;
---
<header class="nav">
  <div class="container nav__barra">
    <a href="/" class="nav__logo" aria-label="Beatriz — página inicial">B<span>eatriz</span></a>
    <nav aria-label="Principal">
      <ul>
        {links.map((l) => (
          <li>
            <a href={l.href} aria-current={atual.startsWith(l.href) ? 'page' : undefined}>{l.texto}</a>
          </li>
        ))}
      </ul>
    </nav>
  </div>
</header>

<style>
  .nav {
    position: sticky; top: 0; z-index: 50;
    background: var(--papel);
    border-bottom: 2px solid var(--tinta);
  }
  .nav__barra {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; flex-wrap: wrap; padding-block: 0.6rem;
  }
  .nav__logo {
    font-family: var(--fonte-display); font-size: 1.6rem; font-weight: 900;
    text-decoration: none; line-height: 1;
  }
  .nav__logo span { font-style: italic; font-weight: 400; }
  ul { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; list-style: none; margin: 0; padding: 0; }
  a[aria-current='page'], ul a:hover { color: var(--vermelho); }
  ul a {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    text-decoration: none;
  }
  a[aria-current='page'] { text-decoration: underline; text-underline-offset: 4px; }
  @media (min-width: 768px) {
    ul { gap: 2rem; }
    ul a { font-size: 0.78rem; }
  }
</style>
```

`src/components/Expediente.astro`:
```astro
---
import site from '../data/site.json';
import { linkWhatsApp, linkInstagram } from '../lib/contato';

const c = site.contatos;
const ano = new Date().getFullYear();
---
<footer id="expediente" class="expediente">
  <div class="container expediente__grade">
    <div>
      <p class="kicker">Expediente</p>
      <p class="expediente__titulo">Vamos conversar?</p>
      <p>Encomendas, colaborações e oportunidades de trabalho.</p>
    </div>
    <ul class="expediente__contatos">
      <li>
        <span class="kicker">WhatsApp</span>
        <a href={linkWhatsApp(c.whatsapp, c.mensagemWhatsApp)} target="_blank" rel="noopener">{c.whatsapp}</a>
      </li>
      <li>
        <span class="kicker">E-mail</span>
        <a href={`mailto:${c.email}`}>{c.email}</a>
      </li>
      <li>
        <span class="kicker">Instagram</span>
        <a href={linkInstagram(c.instagram)} target="_blank" rel="noopener">{c.instagram}</a>
      </li>
    </ul>
    <p class="expediente__credito">Direção criativa, modelagem, corte e costura: {site.nome}. © {ano}</p>
  </div>
</footer>

<style>
  .expediente { background: var(--tinta); color: var(--papel); padding-block: 4rem 2rem; margin-top: 6rem; }
  .expediente__grade { display: grid; gap: 2.5rem; }
  .expediente__titulo {
    font-family: var(--fonte-display); font-style: italic;
    font-size: clamp(2.5rem, 8vw, 5rem); line-height: 1; margin: 0.5rem 0 1rem;
  }
  .expediente__contatos { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.25rem; }
  .expediente__contatos li { display: grid; gap: 0.25rem; }
  .expediente__contatos a {
    color: var(--rosa); font-family: var(--fonte-display); font-size: clamp(1.25rem, 3vw, 1.75rem);
    text-decoration: none; overflow-wrap: anywhere;
  }
  .expediente__contatos a:hover { text-decoration: underline; }
  .expediente__credito { font-size: 0.8rem; opacity: 0.75; border-top: 1px solid currentColor; padding-top: 1rem; margin: 0; }
  @media (min-width: 768px) {
    .expediente__grade { grid-template-columns: 1.2fr 1fr; }
    .expediente__credito { grid-column: 1 / -1; }
  }
</style>
```

`src/layouts/Revista.astro` (arquivo inteiro):
```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import type { ImageMetadata } from 'astro';
import { ClientRouter } from 'astro:transitions';
import { getImage } from 'astro:assets';
import Navegacao from '../components/Navegacao.astro';
import Expediente from '../components/Expediente.astro';
import ogPadrao from '../assets/og-padrao.jpg';
import site from '../data/site.json';

interface Props {
  titulo?: string;
  descricao?: string;
  imagemOg?: ImageMetadata;
}
const { titulo, descricao = site.descricao, imagemOg = ogPadrao } = Astro.props;
const tituloCompleto = titulo ? `${titulo} · ${site.titulo}` : site.titulo;
const og = await getImage({ src: imagemOg, width: 1200, format: 'jpg' });
const ogUrl = new URL(og.src, Astro.site).href;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
---
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{tituloCompleto}</title>
    <meta name="description" content={descricao} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content={site.titulo} />
    <meta property="og:title" content={tituloCompleto} />
    <meta property="og:description" content={descricao} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Inter:wght@400;500;700&display=swap"
    />
    <ClientRouter />
  </head>
  <body>
    <a class="pular" href="#conteudo">Pular para o conteúdo</a>
    <Navegacao />
    <main id="conteudo">
      <slot />
    </main>
    <Expediente />
  </body>
</html>
```

Na página provisória `src/pages/index.astro`, troque `<Revista titulo="Beatriz">` por `<Revista>` (o título padrão passa a ser "Beatriz · Modelista").

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/layout.spec.ts tests/e2e/smoke.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: navegação, expediente com contatos e metadados de compartilhamento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Capa (home) e card de peça

**Files:**
- Create: `src/components/CardPeca.astro`
- Modify: `src/pages/index.astro` (substituir o arquivo inteiro)
- Test: `tests/e2e/capa.spec.ts`

**Interfaces:**
- Consumes: `pecaDeCapa`, `porRecencia` (Task 2); collection `pecas` (Task 3); `site.json` (Task 4).
- Produces: `CardPeca.astro` com Props `{ peca: CollectionEntry<'pecas'> }` e markup `article.card-peca > a[href="/pecas/<id>"]`. Na capa: `.capa[data-anim="capa"]`, letras `[data-letra]`, `.capa__foto`, chamadas `li[data-chamada]`. Esses são os alvos da Task 10.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/capa.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('capa estampa a peça em destaque com link para a matéria', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Vestido longo rosa/ })).toHaveAttribute('href', '/pecas/vestido-aurora');
});

test('capa tem as três chamadas apontando para as seções', async ({ page }) => {
  await page.goto('/');
  const chamadas = page.locator('[data-chamada] a');
  await expect(chamadas).toHaveCount(3);
  expect(await chamadas.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/processo',
    '/colecoes',
    '/sobre',
  ]);
});

test('"Nesta edição" lista três peças recentes sem repetir a da capa', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.destaques .card-peca a');
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/pecas/blusa-alvorada',
    '/pecas/blazer-concreto',
    '/pecas/calca-viga',
  ]);
});

test('o nome gigante não causa rolagem horizontal', async ({ page }) => {
  await page.goto('/');
  const cabe = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(cabe).toBe(true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/capa.spec.ts`
Expected: FAIL (link "Vestido longo rosa" não encontrado).

- [ ] **Step 3: Implementar**

`src/components/CardPeca.astro`:
```astro
---
import { getEntry, type CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';

interface Props {
  peca: CollectionEntry<'pecas'>;
}
const { peca } = Astro.props;
const colecao = await getEntry(peca.data.colecao);
const cor = colecao?.data.cor ?? 'var(--rosa)';
---
<article class="card-peca" data-anim="revelar" style={`--cor: ${cor}`}>
  <a href={`/pecas/${peca.id}`}>
    <div class="card-peca__foto">
      <Image src={peca.data.capa} alt={peca.data.capaAlt} widths={[360, 600, 900]} sizes="(min-width: 768px) 30vw, 90vw" />
    </div>
    <p class="kicker">{colecao?.data.nome} · {peca.data.ano}</p>
    <h3>{peca.data.titulo}</h3>
  </a>
</article>

<style>
  a { display: grid; gap: 0.6rem; text-decoration: none; }
  .card-peca__foto {
    aspect-ratio: 3 / 4; overflow: hidden;
    box-shadow: 10px 10px 0 var(--cor);
    margin-bottom: 0.6rem;
  }
  .card-peca__foto :global(img) {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  a:hover .card-peca__foto :global(img) { transform: scale(1.06); }
  a:hover h3 { font-style: italic; }
</style>
```

`src/pages/index.astro` (arquivo inteiro):
```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import Revista from '../layouts/Revista.astro';
import CardPeca from '../components/CardPeca.astro';
import site from '../data/site.json';
import { pecaDeCapa, porRecencia } from '../lib/colecoes';

const pecas = await getCollection('pecas');
const capa = pecaDeCapa(pecas);
if (!capa) throw new Error('Adicione ao menos uma peça em src/content/pecas para montar a capa.');
const destaques = pecas.filter((p) => p.id !== capa.id).sort(porRecencia).slice(0, 3);
const letras = [...site.nome.toUpperCase()];
---
<Revista>
  <section class="capa" data-anim="capa">
    <div class="container capa__topo">
      <p class="kicker">{site.edicao}</p>
      <p class="kicker">Modelagem · Corte · Costura</p>
    </div>
    <div class="container capa__palco">
      <h1 class="capa__nome">
        <span class="sr-only">{site.nome}</span>
        <span class="capa__letras" aria-hidden="true">
          {letras.map((l) => <span class="capa__letra" data-letra>{l}</span>)}
        </span>
      </h1>
      <a href={`/pecas/${capa.id}`} class="capa__foto">
        <Image
          src={capa.data.capa}
          alt={capa.data.capaAlt}
          widths={[480, 800, 1200]}
          sizes="(min-width: 768px) 40vw, 78vw"
          loading="eager"
          fetchpriority="high"
        />
      </a>
      <ul class="capa__chamadas">
        {site.chamadas.map((c, i) => (
          <li data-chamada>
            <a href={c.href}>
              <span class="capa__num">{String(i + 1).padStart(2, '0')}</span>
              <span>{c.texto}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </section>

  {destaques.length > 0 && (
    <section class="container destaques">
      <h2 data-anim="revelar">Nesta edição</h2>
      <div class="destaques__grade">
        {destaques.map((p) => <CardPeca peca={p} />)}
      </div>
    </section>
  )}
</Revista>

<style>
  .capa { padding-block: 1.25rem 3rem; overflow: hidden; }
  .capa__topo {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem 1rem;
    border-bottom: 2px solid var(--tinta); padding-bottom: 0.75rem;
  }
  .capa__palco { display: grid; margin-top: 1rem; }
  .capa__nome {
    grid-area: 1 / 1; z-index: 1;
    font-size: clamp(3.25rem, 18.5vw, 17rem); line-height: 0.85; letter-spacing: -0.02em;
    color: var(--rosa); text-align: center;
  }
  .capa__letras { display: inline-flex; overflow: hidden; padding-block: 0.04em; }
  .capa__letra { display: inline-block; }
  .capa__foto {
    grid-area: 1 / 1; z-index: 2; justify-self: center;
    width: min(78%, 520px);
    margin-top: clamp(2.25rem, 11vw, 9rem);
    transform: rotate(-2deg);
    box-shadow: 12px 12px 0 var(--cobalto);
  }
  .capa__chamadas { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; gap: 1rem; }
  .capa__chamadas a {
    display: flex; gap: 0.75rem; align-items: baseline;
    font-family: var(--fonte-display); font-size: clamp(1.25rem, 2.4vw, 1.75rem); line-height: 1.15;
    text-decoration: none;
  }
  .capa__chamadas a:hover { color: var(--vermelho); }
  .capa__num {
    flex: none; font-family: var(--fonte-texto); font-size: 0.75rem; font-weight: 700;
    background: var(--amarelo); padding: 0.1rem 0.4rem;
  }
  .destaques { padding-block: 3rem; }
  .destaques h2 { margin-bottom: 2rem; font-style: italic; }
  .destaques__grade { display: grid; gap: 2.5rem; }

  @media (min-width: 768px) {
    .capa__foto { justify-self: end; margin-right: 6%; width: min(40%, 520px); }
    .capa__chamadas {
      grid-area: 1 / 1; z-index: 3; align-self: end; justify-self: start;
      max-width: min(42%, 30ch); margin: 0; padding-bottom: 2rem;
    }
    .destaques__grade { grid-template-columns: repeat(3, 1fr); }
    .destaques__grade > :nth-child(2) { margin-top: 4rem; }
  }
</style>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/capa.spec.ts tests/e2e/smoke.spec.ts`
Expected: PASS nos dois projetos (desktop e mobile). Se o teste de rolagem horizontal falhar no mobile, reduza o `18.5vw` de `.capa__nome` até passar. Não esconda o problema com `overflow-x: hidden` no `body`.

- [ ] **Step 5: Conferência visual**

Run: `npm run dev` e abra `http://localhost:4321` em largura desktop e em ~375px (DevTools). A foto deve se sobrepor à metade de baixo das letras "BEATRIZ", e as chamadas não podem cobrir a foto.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: capa da revista com peça em destaque e chamadas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Coleções (sumário e página da coleção)

**Files:**
- Create: `src/components/CardColecao.astro`, `src/pages/colecoes/index.astro`, `src/pages/colecoes/[slug].astro`
- Test: `tests/e2e/colecoes.spec.ts`

**Interfaces:**
- Consumes: `ordenarColecoes`, `pecasDaColecao`, `pecaDeCapa` (Task 2); `corDeTextoSobre` (Task 2); `CardPeca` (Task 5); `Revista` Props (Task 4).
- Produces: `CardColecao.astro` com Props `{ href: string; nome: string; ano: number; resumo: string; cor: string; capa?: ImageMetadata; capaAlt?: string; total: number }`, renderizado como `a.card-colecao[data-anim="revelar"]` com `style="--cor:…;--cor-texto:…"`. Rotas `/colecoes` e `/colecoes/<id>`.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/colecoes.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('sumário lista as coleções na ordem definida, com contagem de peças', async ({ page }) => {
  await page.goto('/colecoes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Coleções');
  const cards = page.locator('.card-colecao');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute('href', '/colecoes/aurora');
  await expect(cards.nth(0)).toContainText('3 peças');
  await expect(cards.nth(1)).toHaveAttribute('href', '/colecoes/concreto');
});

test('o texto do card usa a cor com melhor contraste sobre o bloco', async ({ page }) => {
  await page.goto('/colecoes');
  await expect(page.locator('a[href="/colecoes/aurora"]')).toHaveAttribute('style', /--cor-texto:\s*#141414/);
  await expect(page.locator('a[href="/colecoes/concreto"]')).toHaveAttribute('style', /--cor-texto:\s*#ffffff/);
});

test('página da coleção mostra só as peças dela, mais recentes primeiro', async ({ page }) => {
  await page.goto('/colecoes/concreto');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Concreto');
  const links = page.locator('.card-peca a');
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/pecas/blazer-concreto',
    '/pecas/calca-viga',
    '/pecas/macacao-ponte',
  ]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/colecoes.spec.ts`
Expected: FAIL (404 em `/colecoes`, o heading não é encontrado).

- [ ] **Step 3: Implementar**

`src/components/CardColecao.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import { Image } from 'astro:assets';
import { corDeTextoSobre } from '../lib/cor';

interface Props {
  href: string;
  nome: string;
  ano: number;
  resumo: string;
  cor: string;
  capa?: ImageMetadata;
  capaAlt?: string;
  total: number;
}
const { href, nome, ano, resumo, cor, capa, capaAlt, total } = Astro.props;
const contagem = total === 0 ? 'Em breve' : `${total} ${total === 1 ? 'peça' : 'peças'}`;
---
<a class="card-colecao" href={href} data-anim="revelar" style={`--cor: ${cor}; --cor-texto: ${corDeTextoSobre(cor)}`}>
  {capa && (
    <div class="card-colecao__foto">
      <Image src={capa} alt={capaAlt ?? ''} widths={[400, 700, 1000]} sizes="(min-width: 768px) 55vw, 100vw" />
    </div>
  )}
  <div class="card-colecao__texto">
    <p class="kicker">{ano} · {contagem}</p>
    <h2>{nome}</h2>
    <p>{resumo}</p>
  </div>
</a>

<style>
  .card-colecao { display: grid; text-decoration: none; }
  .card-colecao__foto { aspect-ratio: 4 / 3; overflow: hidden; }
  .card-colecao__foto :global(img) {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card-colecao__texto {
    position: relative; isolation: isolate;
    margin: -3rem 1rem 0; padding: 1.25rem 1.5rem;
    background: var(--papel); border: 2px solid var(--tinta);
    transition: color 0.35s;
  }
  .card-colecao__texto::before {
    content: ''; position: absolute; inset: 0; z-index: -1;
    background: var(--cor);
    transform: scaleY(0); transform-origin: bottom;
    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card-colecao__texto h2 { margin: 0.4rem 0; font-size: clamp(2.25rem, 6vw, 4rem); }
  .card-colecao__texto p { margin: 0; }
  .card-colecao:hover .card-colecao__texto,
  .card-colecao:focus-visible .card-colecao__texto { color: var(--cor-texto); }
  .card-colecao:hover .card-colecao__texto::before,
  .card-colecao:focus-visible .card-colecao__texto::before { transform: scaleY(1); }
  .card-colecao:hover .card-colecao__foto :global(img) { transform: scale(1.05); }
  .card-colecao:not(:has(.card-colecao__foto)) .card-colecao__texto { margin: 0; }
</style>
```

`src/pages/colecoes/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Revista from '../../layouts/Revista.astro';
import CardColecao from '../../components/CardColecao.astro';
import { ordenarColecoes, pecasDaColecao, pecaDeCapa } from '../../lib/colecoes';

const colecoes = ordenarColecoes(await getCollection('colecoes'));
const pecas = await getCollection('pecas');
const cards = colecoes.map((c) => {
  const daColecao = pecasDaColecao(pecas, c.id);
  return { colecao: c, total: daColecao.length, capa: pecaDeCapa(daColecao) };
});
---
<Revista titulo="Coleções" descricao="Sumário das coleções autorais de Beatriz.">
  <header class="container sumario-topo">
    <p class="kicker">Sumário</p>
    <h1 data-anim="revelar">Coleções</h1>
  </header>
  <div class="container sumario">
    {cards.map(({ colecao, total, capa }) => (
      <CardColecao
        href={`/colecoes/${colecao.id}`}
        nome={colecao.data.nome}
        ano={colecao.data.ano}
        resumo={colecao.data.resumo}
        cor={colecao.data.cor}
        capa={capa?.data.capa}
        capaAlt={capa?.data.capaAlt}
        total={total}
      />
    ))}
  </div>
</Revista>

<style>
  .sumario-topo { padding-block: 3rem 2rem; border-bottom: 2px solid var(--tinta); margin-bottom: 3rem; }
  .sumario { display: grid; gap: 4rem; }
  @media (min-width: 768px) {
    .sumario { grid-template-columns: repeat(12, 1fr); row-gap: 6rem; }
    .sumario > :global(:nth-child(odd)) { grid-column: 1 / span 7; }
    .sumario > :global(:nth-child(even)) { grid-column: 6 / -1; }
  }
</style>
```

`src/pages/colecoes/[slug].astro`:
```astro
---
import { getCollection, render, type CollectionEntry } from 'astro:content';
import Revista from '../../layouts/Revista.astro';
import CardPeca from '../../components/CardPeca.astro';
import { pecasDaColecao, pecaDeCapa } from '../../lib/colecoes';
import { corDeTextoSobre } from '../../lib/cor';

export async function getStaticPaths() {
  const colecoes = await getCollection('colecoes');
  return colecoes.map((colecao) => ({ params: { slug: colecao.id }, props: { colecao } }));
}

interface Props {
  colecao: CollectionEntry<'colecoes'>;
}
const { colecao } = Astro.props;
const pecas = pecasDaColecao(await getCollection('pecas'), colecao.id);
const { Content } = await render(colecao);
---
<Revista titulo={colecao.data.nome} descricao={colecao.data.resumo} imagemOg={pecaDeCapa(pecas)?.data.capa}>
  <header class="colecao-topo" style={`--cor: ${colecao.data.cor}; --cor-texto: ${corDeTextoSobre(colecao.data.cor)}`}>
    <div class="container">
      <p class="kicker"><a href="/colecoes">Coleções</a> / {colecao.data.ano}</p>
      <h1 data-anim="revelar">{colecao.data.nome}</h1>
      <div class="colecao-topo__texto"><Content /></div>
    </div>
  </header>
  <div class="container colecao-grade">
    {pecas.length > 0 ? pecas.map((p) => <CardPeca peca={p} />) : <p class="vazio">Peças desta coleção em breve.</p>}
  </div>
</Revista>

<style>
  .colecao-topo { background: var(--cor); color: var(--cor-texto); padding-block: 3rem; margin-bottom: 3rem; }
  .colecao-topo h1 { font-size: clamp(3.5rem, 14vw, 10rem); margin-block: 0.5rem 1rem; }
  .colecao-topo__texto { max-width: 60ch; font-size: 1.15rem; }
  .colecao-grade { display: grid; gap: 3rem; }
  .vazio { font-family: var(--fonte-display); font-style: italic; font-size: 1.5rem; }
  @media (min-width: 768px) {
    .colecao-grade { grid-template-columns: repeat(3, 1fr); }
    .colecao-grade > :global(:nth-child(3n + 2)) { margin-top: 4rem; }
  }
</style>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/colecoes.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sumário de coleções e página de cada coleção

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página da peça (matéria, ficha técnica e galeria com ampliação)

**Files:**
- Create: `src/components/FichaTecnica.astro`, `src/components/GaleriaPeca.astro`, `src/pages/pecas/[slug].astro`
- Test: `tests/e2e/peca.spec.ts`

**Interfaces:**
- Consumes: collection `pecas`/`colecoes`; `Revista`.
- Produces: `FichaTecnica` com Props `{ itens: { rotulo: string; valor: string }[] }` → `aside.ficha`. `GaleriaPeca` com Props `{ titulo: string; imagens: { src: ImageMetadata; alt: string }[] }` → `section.galeria`, botões `[data-ampliar]` e `dialog.lightbox`. A foto principal tem `[data-anim="parallax"]` (alvo da Task 10). Link do processo: `/processo#<id>`.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/peca.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const SLUGS = ['vestido-aurora', 'blusa-alvorada', 'saia-orvalho', 'blazer-concreto', 'calca-viga', 'macacao-ponte'];

test('todas as peças têm página', async ({ request }) => {
  for (const slug of SLUGS) {
    const r = await request.get(`/pecas/${slug}`);
    expect(r.status(), slug).toBe(200);
  }
});

test('matéria mostra título, ficha técnica e link do processo', async ({ page }) => {
  await page.goto('/pecas/vestido-aurora');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vestido Aurora');
  const ficha = page.locator('.ficha');
  for (const texto of ['Aurora', '2026', 'Crepe de seda', 'Moulage e drapeado']) {
    await expect(ficha).toContainText(texto);
  }
  await expect(page.getByRole('link', { name: /Ver o processo/ })).toHaveAttribute('href', '/processo#vestido-aurora');
});

test('galeria amplia a foto e fecha com Esc', async ({ page }) => {
  await page.goto('/pecas/vestido-aurora');
  await page.getByRole('button', { name: 'Ampliar foto: Detalhe do drapeado no ombro esquerdo.' }).click();
  const dialogo = page.locator('dialog.lightbox');
  await expect(dialogo).toBeVisible();
  const img = dialogo.locator('img');
  await expect(img).toHaveAttribute('alt', 'Detalhe do drapeado no ombro esquerdo.');
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
});

test('peça sem galeria e sem processo não mostra seções vazias', async ({ page }) => {
  await page.goto('/pecas/macacao-ponte');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Macacão Ponte');
  await expect(page.locator('.galeria')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Ver o processo/ })).toHaveCount(0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/peca.spec.ts`
Expected: FAIL (status 404 em `/pecas/vestido-aurora`).

- [ ] **Step 3: Implementar**

`src/components/FichaTecnica.astro`:
```astro
---
interface Props {
  itens: { rotulo: string; valor: string }[];
}
const { itens } = Astro.props;
---
<aside class="ficha" aria-label="Ficha técnica">
  <p class="kicker">Ficha técnica</p>
  <dl>
    {itens.map((i) => (
      <div>
        <dt>{i.rotulo}</dt>
        <dd>{i.valor}</dd>
      </div>
    ))}
  </dl>
</aside>

<style>
  .ficha { border-top: 6px solid var(--tinta); padding-top: 0.75rem; align-self: start; }
  dl { margin: 0.75rem 0 0; display: grid; gap: 0.75rem; }
  div { border-bottom: 1px solid var(--tinta); padding-bottom: 0.5rem; }
  dt { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
  dd { margin: 0; font-family: var(--fonte-display); font-size: 1.25rem; }
</style>
```

`src/components/GaleriaPeca.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import { Image, getImage } from 'astro:assets';

interface Props {
  titulo: string;
  imagens: { src: ImageMetadata; alt: string }[];
}
const { titulo, imagens } = Astro.props;
const ampliadas = await Promise.all(imagens.map((i) => getImage({ src: i.src, width: 1600 })));
---
<section class="galeria container" aria-label={`Galeria de fotos: ${titulo}`}>
  <ul class="galeria__grade">
    {imagens.map((img, i) => (
      <li data-anim="revelar">
        <button type="button" class="galeria__item" data-ampliar={ampliadas[i].src} data-alt={img.alt} aria-label={`Ampliar foto: ${img.alt}`}>
          <Image src={img.src} alt="" widths={[360, 600, 900]} sizes="(min-width: 768px) 33vw, 50vw" />
        </button>
      </li>
    ))}
  </ul>
  <dialog class="lightbox" aria-label="Foto ampliada">
    <form method="dialog">
      <button class="lightbox__fechar" aria-label="Fechar foto ampliada">×</button>
    </form>
    <img class="lightbox__img" alt="" />
  </dialog>
</section>

<script>
  // Delegação no document: funciona em todas as páginas mesmo com o ClientRouter trocando o DOM.
  document.addEventListener('click', (evento) => {
    const alvo = evento.target as HTMLElement;
    const botao = alvo.closest<HTMLButtonElement>('[data-ampliar]');
    if (botao) {
      const dialogo = document.querySelector<HTMLDialogElement>('dialog.lightbox');
      const img = dialogo?.querySelector<HTMLImageElement>('.lightbox__img');
      if (!dialogo || !img) return;
      img.src = botao.dataset.ampliar ?? '';
      img.alt = botao.dataset.alt ?? '';
      dialogo.showModal();
      return;
    }
    // Clique no fundo escuro (fora da foto) fecha.
    if (alvo instanceof HTMLDialogElement && alvo.classList.contains('lightbox')) alvo.close();
  });
</script>

<style>
  .galeria { padding-block: 3rem; }
  .galeria__grade { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .galeria__item { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; overflow: hidden; aspect-ratio: 3 / 4; }
  .galeria__item :global(img) { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
  .galeria__item:hover :global(img) { transform: scale(1.05); }
  .lightbox { padding: 0; border: 0; background: transparent; max-width: 92vw; max-height: 92vh; overflow: visible; }
  .lightbox::backdrop { background: rgb(20 20 20 / 0.9); }
  .lightbox__img { max-width: 92vw; max-height: 88vh; width: auto; object-fit: contain; }
  .lightbox__fechar {
    position: absolute; top: -0.75rem; right: -0.75rem;
    width: 2.75rem; height: 2.75rem; border-radius: 50%; border: 0;
    background: var(--rosa); color: var(--tinta); font-size: 1.75rem; line-height: 1; cursor: pointer;
  }
  @media (min-width: 768px) {
    .galeria__grade { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .galeria__grade > li:nth-child(3n + 2) { margin-top: 3rem; }
  }
</style>
```

`src/pages/pecas/[slug].astro`:
```astro
---
import { getCollection, getEntry, render, type CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import Revista from '../../layouts/Revista.astro';
import FichaTecnica from '../../components/FichaTecnica.astro';
import GaleriaPeca from '../../components/GaleriaPeca.astro';

export async function getStaticPaths() {
  const pecas = await getCollection('pecas');
  return pecas.map((peca) => ({ params: { slug: peca.id }, props: { peca } }));
}

interface Props {
  peca: CollectionEntry<'pecas'>;
}
const { peca } = Astro.props;
const colecao = await getEntry(peca.data.colecao);
if (!colecao) throw new Error(`A peça "${peca.id}" aponta para a coleção "${peca.data.colecao.id}", que não existe.`);
const { Content } = await render(peca);
const d = peca.data;
---
<Revista
  titulo={d.titulo}
  descricao={`${d.titulo}: ${d.tecnica.toLowerCase()} em ${d.tecido.toLowerCase()}. Coleção ${colecao.data.nome}.`}
  imagemOg={d.capa}
>
  <article class="materia" style={`--cor: ${colecao.data.cor}`}>
    <header class="container materia__topo">
      <div class="materia__titulo">
        <p class="kicker"><a href={`/colecoes/${colecao.id}`}>Coleção {colecao.data.nome}</a> · {d.ano}</p>
        <h1 data-anim="revelar">{d.titulo}</h1>
      </div>
      <div class="materia__foto" data-anim="parallax">
        <Image src={d.capa} alt={d.capaAlt} widths={[600, 900, 1400]} sizes="(min-width: 768px) 55vw, 100vw" loading="eager" fetchpriority="high" />
      </div>
    </header>

    <div class="container materia__corpo">
      <FichaTecnica
        itens={[
          { rotulo: 'Coleção', valor: colecao.data.nome },
          { rotulo: 'Ano', valor: String(d.ano) },
          { rotulo: 'Tecido', valor: d.tecido },
          { rotulo: 'Técnica', valor: d.tecnica },
        ]}
      />
      <div class="materia__texto" data-anim="revelar"><Content /></div>
    </div>

    {d.galeria.length > 0 && <GaleriaPeca titulo={d.titulo} imagens={d.galeria} />}

    {d.processo && (
      <p class="container materia__processo">
        <a class="botao" href={`/processo#${peca.id}`}>Ver o processo desta peça: do croqui à costura →</a>
      </p>
    )}
  </article>
</Revista>

<style>
  .materia__topo { display: grid; gap: 1.5rem; padding-block: 2.5rem 0; }
  .materia__titulo h1 { margin-top: 0.5rem; }
  .materia__titulo h1::after { content: ''; display: block; width: 5rem; height: 8px; background: var(--cor); margin-top: 1rem; }
  .materia__foto { overflow: hidden; aspect-ratio: 4 / 5; }
  .materia__foto :global(img) { width: 100%; height: 100%; object-fit: cover; }
  .materia__corpo { display: grid; gap: 2.5rem; padding-block: 3rem; }
  .materia__texto { max-width: 62ch; font-size: 1.125rem; }
  .materia__texto :global(p:first-child::first-letter) {
    float: left; font-family: var(--fonte-display); font-size: 4.5em; line-height: 0.8;
    padding: 0.05em 0.1em 0 0; color: var(--vermelho);
  }
  .materia__processo { padding-bottom: 2rem; }
  @media (min-width: 768px) {
    .materia__topo { grid-template-columns: 1fr 1.2fr; align-items: end; }
    .materia__corpo { grid-template-columns: 1fr 2fr; }
  }
</style>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/peca.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: matéria da peça com ficha técnica e galeria ampliável

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Processo (do croqui à costura)

**Files:**
- Create: `src/components/ProcessoScroll.astro`, `src/pages/processo.astro`
- Test: `tests/e2e/processo.spec.ts`

**Interfaces:**
- Consumes: `etapasEmOrdem` (Task 2); `porRecencia` (Task 2); `processo` do schema de peças (Task 3).
- Produces: `ProcessoScroll` com Props `{ id: string; titulo: string; cor: string; processo: Record<ChaveEtapa, { imagem: ImageMetadata; alt: string; texto: string }> }` → `section.processo#<id>`, `li.processo__passo`, `figure.processo__figura` (sticky ≥768px), `.processo__texto`. São os alvos da Task 10.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/processo.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('processo mostra os quatro atos na ordem do ateliê', async ({ page }) => {
  await page.goto('/processo');
  const secao = page.locator('#vestido-aurora');
  await expect(secao.locator('.processo__passo h3')).toHaveText(['Croqui', 'Molde', 'Corte e costura', 'Peça pronta']);
});

test('só aparecem as peças que têm processo', async ({ page }) => {
  await page.goto('/processo');
  await expect(page.locator('section.processo')).toHaveCount(1);
});

test('imagem presa no desktop, sequência simples no celular', async ({ page, isMobile }) => {
  await page.goto('/processo');
  const figura = page.locator('#vestido-aurora .processo__figura').first();
  const posicao = await figura.evaluate((el) => getComputedStyle(el).position);
  expect(posicao).toBe(isMobile ? 'static' : 'sticky');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/processo.spec.ts`
Expected: FAIL (404 em `/processo`).

- [ ] **Step 3: Implementar**

`src/components/ProcessoScroll.astro`:
```astro
---
import type { ImageMetadata } from 'astro';
import { Image } from 'astro:assets';
import { etapasEmOrdem, type ChaveEtapa } from '../lib/processo';

interface Etapa {
  imagem: ImageMetadata;
  alt: string;
  texto: string;
}
interface Props {
  id: string;
  titulo: string;
  cor: string;
  processo: Record<ChaveEtapa, Etapa>;
}
const { id, titulo, cor, processo } = Astro.props;
const etapas = etapasEmOrdem(processo);
---
<section class="processo" id={id} style={`--cor: ${cor}`} aria-labelledby={`t-${id}`}>
  <header class="container processo__cabeca">
    <p class="kicker">Anatomia de uma peça</p>
    <h2 id={`t-${id}`} data-anim="revelar"><a href={`/pecas/${id}`}>{titulo}</a></h2>
  </header>
  <ol class="container processo__passos">
    {etapas.map((e) => (
      <li class="processo__passo">
        <figure class="processo__figura">
          <Image src={e.imagem} alt={e.alt} widths={[500, 800, 1200]} sizes="(min-width: 768px) 50vw, 100vw" />
        </figure>
        <div class="processo__texto">
          <span class="processo__num" aria-hidden="true">{e.numero}</span>
          <h3>{e.rotulo}</h3>
          <p>{e.texto}</p>
        </div>
      </li>
    ))}
  </ol>
</section>

<style>
  .processo { padding-block: 3rem; border-top: 2px solid var(--tinta); }
  .processo__cabeca h2 a { text-decoration: none; }
  .processo__cabeca h2 a:hover { font-style: italic; }
  .processo__passos { list-style: none; padding: 0; margin-top: 2rem; }
  .processo__passo { display: grid; gap: 1.25rem; padding-block: 2rem; }
  .processo__figura { margin: 0; overflow: hidden; aspect-ratio: 4 / 5; background: var(--cor); }
  .processo__figura :global(img) { width: 100%; height: 100%; object-fit: cover; }
  .processo__num { display: block; font-family: var(--fonte-display); font-size: 4rem; line-height: 1; color: var(--vermelho); }
  .processo__texto h3 { margin-block: 0.25rem 0.75rem; }
  .processo__texto p { max-width: 42ch; font-size: 1.125rem; margin: 0; }
  @media (min-width: 768px) {
    .processo__passo { grid-template-columns: 1.1fr 1fr; gap: 4rem; min-height: 130vh; align-items: start; padding-block: 0; }
    .processo__figura { position: sticky; top: 12vh; height: 76vh; aspect-ratio: auto; }
    .processo__texto { position: sticky; top: 40vh; }
  }
</style>
```

`src/pages/processo.astro`:
```astro
---
import { getCollection, getEntry } from 'astro:content';
import Revista from '../layouts/Revista.astro';
import ProcessoScroll from '../components/ProcessoScroll.astro';
import { porRecencia } from '../lib/colecoes';

const pecas = (await getCollection('pecas')).sort(porRecencia);
const comProcesso = await Promise.all(
  pecas.flatMap((p) => (p.data.processo ? [{ peca: p, processo: p.data.processo }] : [])).map(async (item) => ({
    ...item,
    cor: (await getEntry(item.peca.data.colecao))?.data.cor ?? '#ff2e88',
  })),
);
---
<Revista titulo="Processo" descricao="Do croqui à costura: como nascem as peças de Beatriz.">
  <header class="container processo-topo">
    <p class="kicker">Reportagem</p>
    <h1 data-anim="revelar">Do croqui <em>à costura</em></h1>
    <p class="processo-topo__linha" data-anim="revelar">
      Cada peça passa por quatro atos: o desenho, o molde, o corte e a costura. Role a página para acompanhar.
    </p>
  </header>
  {comProcesso.length > 0
    ? comProcesso.map(({ peca, processo, cor }) => (
        <ProcessoScroll id={peca.id} titulo={peca.data.titulo} cor={cor} processo={processo} />
      ))
    : <p class="container">Novos bastidores em breve.</p>}
</Revista>

<style>
  .processo-topo { padding-block: 3rem; }
  .processo-topo em { color: var(--vermelho); }
  .processo-topo__linha { max-width: 50ch; font-size: 1.2rem; margin-top: 1.25rem; }
</style>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/processo.spec.ts`
Expected: PASS (no projeto desktop a figura é `sticky`; no mobile, `static`).

- [ ] **Step 5: Conferência visual**

Run: `npm run dev` e abra `/processo` no desktop. Ao rolar, cada imagem fica presa enquanto o texto dela passa, e depois a próxima entra.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: reportagem de processo do croqui à costura

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sobre + Currículo (entrevista, linha do tempo, habilidades, CV)

**Files:**
- Create: `src/components/LinhaDoTempo.astro`, `src/pages/sobre.astro`
- Test: `tests/e2e/sobre.spec.ts`

**Interfaces:**
- Consumes: `ordenarTrajetoria`, `formatarPeriodo`, `ItemTrajetoria` (Task 2); collection `sobre` (Task 3); `public/cv-beatriz.pdf` (Task 3).
- Produces: `LinhaDoTempo` com Props `{ itens: ItemTrajetoria[] }` → `ol.linha[data-anim="linha"]` com `li.linha__item` e `.linha__periodo`. A linha usa a variável CSS `--progresso` (padrão 1), animada na Task 10.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/sobre.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('sobre apresenta a Beatriz com entrevista e habilidades', async ({ page }) => {
  await page.goto('/sobre');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beatriz Sobrenome');
  await expect(page.locator('.entrevista dt')).toHaveCount(3);
  await expect(page.locator('.habilidades li')).toContainText(['Modelagem plana', 'Moulage']);
});

test('linha do tempo começa pelo trabalho atual', async ({ page }) => {
  await page.goto('/sobre');
  await expect(page.locator('.linha__periodo')).toHaveText(['2024 — atual', '2022 — 2024', '2023', '2019 — 2022']);
});

test('botão baixa o currículo em PDF', async ({ page }) => {
  await page.goto('/sobre');
  const link = page.getByRole('link', { name: 'Baixar currículo (PDF)' });
  await expect(link).toHaveAttribute('href', '/cv-beatriz.pdf');
  await expect(link).toHaveAttribute('download', '');
  const r = await page.request.get('/cv-beatriz.pdf');
  expect(r.ok()).toBe(true);
  expect((await r.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/sobre.spec.ts`
Expected: FAIL (404 em `/sobre`).

- [ ] **Step 3: Implementar**

`src/components/LinhaDoTempo.astro`:
```astro
---
import { ordenarTrajetoria, formatarPeriodo, type ItemTrajetoria } from '../lib/trajetoria';

interface Props {
  itens: ItemTrajetoria[];
}
const itens = ordenarTrajetoria(Astro.props.itens);
const rotuloTipo = { formacao: 'Formação', experiencia: 'Experiência' } as const;
---
<section class="container trajetoria" aria-labelledby="t-trajetoria">
  <h2 id="t-trajetoria" data-anim="revelar">Trajetória</h2>
  <ol class="linha" data-anim="linha">
    {itens.map((i) => (
      <li class="linha__item" data-anim="revelar" data-tipo={i.tipo}>
        <p class="linha__periodo">{formatarPeriodo(i.inicio, i.fim)}</p>
        <p class="kicker">{rotuloTipo[i.tipo]}</p>
        <h3>{i.titulo}</h3>
        <p class="linha__local">{i.local}</p>
        {i.descricao && <p>{i.descricao}</p>}
      </li>
    ))}
  </ol>
</section>

<style>
  .trajetoria { padding-block: 4rem; }
  .trajetoria h2 { margin-bottom: 2.5rem; }
  .linha { --progresso: 1; position: relative; list-style: none; margin: 0; padding: 0 0 0 2rem; display: grid; gap: 2.5rem; }
  .linha::before {
    content: ''; position: absolute; left: 0.4rem; top: 0; bottom: 0; width: 4px;
    background: var(--tinta); transform: scaleY(var(--progresso)); transform-origin: top;
  }
  .linha__item { position: relative; }
  .linha__item::before {
    content: ''; position: absolute; left: -2rem; top: 0.35rem;
    width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 3px solid var(--tinta);
    background: var(--rosa);
  }
  .linha__item[data-tipo='formacao']::before { background: var(--amarelo); }
  .linha__periodo { font-family: var(--fonte-display); font-style: italic; font-size: 1.4rem; margin: 0 0 0.25rem; }
  .linha__item h3 { margin-block: 0.35rem; }
  .linha__local { font-weight: 700; margin: 0; }
  @media (min-width: 768px) {
    .linha { grid-template-columns: 1fr 1fr; column-gap: 4rem; }
  }
</style>
```

`src/pages/sobre.astro`:
```astro
---
import { getEntry, render } from 'astro:content';
import { Image } from 'astro:assets';
import Revista from '../layouts/Revista.astro';
import LinhaDoTempo from '../components/LinhaDoTempo.astro';

const sobre = await getEntry('sobre', 'sobre');
if (!sobre) throw new Error('Crie src/content/sobre/sobre.md');
const { Content } = await render(sobre);
const d = sobre.data;
---
<Revista
  titulo="Sobre"
  descricao={`${d.nome}, ${d.cargo.toLowerCase()} em ${d.cidade}. Trajetória, formação e habilidades.`}
  imagemOg={d.retrato}
>
  <header class="container perfil">
    <div class="perfil__foto" data-anim="parallax">
      <Image src={d.retrato} alt={d.retratoAlt} widths={[400, 700, 1000]} sizes="(min-width: 768px) 40vw, 100vw" loading="eager" />
    </div>
    <div class="perfil__texto">
      <p class="kicker">Entrevista exclusiva</p>
      <h1 data-anim="revelar">{d.nome}</h1>
      <p class="perfil__cargo">{d.cargo} · {d.cidade}</p>
      <div class="perfil__lide"><Content /></div>
      <a class="botao" href="/cv-beatriz.pdf" download>Baixar currículo (PDF)</a>
    </div>
  </header>

  <section class="container entrevista" aria-labelledby="t-entrevista">
    <h2 id="t-entrevista" class="sr-only">Entrevista</h2>
    <dl>
      {d.entrevista.map((e) => (
        <div class="entrevista__par" data-anim="revelar">
          <dt>{e.pergunta}</dt>
          <dd>{e.resposta}</dd>
        </div>
      ))}
    </dl>
  </section>

  <LinhaDoTempo itens={d.trajetoria} />

  <section class="container habilidades" aria-labelledby="t-habilidades">
    <h2 id="t-habilidades" data-anim="revelar">Habilidades</h2>
    <ul>{d.habilidades.map((h) => <li>{h}</li>)}</ul>
  </section>
</Revista>

<style>
  .perfil { display: grid; gap: 2rem; padding-block: 2.5rem; }
  .perfil__foto { overflow: hidden; aspect-ratio: 4 / 5; box-shadow: 14px 14px 0 var(--amarelo); }
  .perfil__foto :global(img) { width: 100%; height: 100%; object-fit: cover; }
  .perfil__texto h1 { margin-block: 0.5rem; }
  .perfil__cargo { font-family: var(--fonte-display); font-style: italic; font-size: 1.5rem; margin: 0 0 1.5rem; }
  .perfil__lide { font-size: 1.2rem; max-width: 52ch; margin-bottom: 2rem; }
  .entrevista { padding-block: 3rem; border-top: 2px solid var(--tinta); }
  .entrevista dl { margin: 0; display: grid; gap: 2.5rem; max-width: 70ch; }
  .entrevista dt { font-family: var(--fonte-display); font-weight: 700; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.15; }
  .entrevista dt::before { content: '— '; color: var(--vermelho); }
  .entrevista dd { margin: 0.75rem 0 0; font-size: 1.125rem; }
  .habilidades ul { list-style: none; margin: 2rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .habilidades li { padding: 0.5rem 1rem; border: 2px solid var(--tinta); font-weight: 700; background: var(--rosa); }
  .habilidades li:nth-child(3n + 2) { background: var(--amarelo); }
  .habilidades li:nth-child(3n) { background: var(--cobalto); color: #fff; }
  @media (min-width: 768px) {
    .perfil { grid-template-columns: 1fr 1.2fr; align-items: center; gap: 4rem; }
  }
</style>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test tests/e2e/sobre.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: página Sobre com entrevista, linha do tempo, habilidades e CV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Animações (GSAP) e transição de página "virada"

**Files:**
- Create: `src/scripts/virada.ts`, `src/scripts/animacoes/index.ts`, `src/scripts/animacoes/capa.ts`, `src/scripts/animacoes/revelar.ts`, `src/scripts/animacoes/parallax.ts`, `src/scripts/animacoes/processo.ts`, `src/scripts/animacoes/linha.ts`, `tests/e2e/utils.ts`
- Modify: `src/layouts/Revista.astro` (main com `transition:animate` + script), `src/styles/global.css` (keyframes + reduced motion)
- Test: `tests/e2e/animacoes.spec.ts`

**Interfaces:**
- Consumes: os alvos `[data-letra]`, `.capa__foto`, `[data-chamada]` (Task 5), `[data-anim="revelar"]` (todas), `[data-anim="parallax"]` (Tasks 7 e 9), `.processo__passo`/`.processo__figura`/`.processo__texto` (Task 8) e `[data-anim="linha"]` (Task 9).
- Produces: cada módulo exporta `iniciar(gsap: typeof import('gsap').gsap): () => void`, que devolve a função de limpeza. Em `<html>`: `data-animacoes="ativas|reduzidas|sem-alvos"`, `data-animacoes-ciclo="<n>"` e `data-gatilhos="<qtd ScrollTriggers>"` (sinais para testes). Em `tests/e2e/utils.ts`: `coletarErros(page): string[]`.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/e2e/utils.ts`:
```ts
import type { Page } from '@playwright/test';

/** Junta erros de JS e de console; ignora falhas de rede das Google Fonts (ambiente offline). */
export function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.location().url.includes('fonts.g')) return;
    erros.push(m.text());
  });
  return erros;
}
```

`tests/e2e/animacoes.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { coletarErros } from './utils';

const ALVOS = '[data-letra], [data-chamada], [data-anim="revelar"]';

test('com movimento reduzido, nada anima e tudo fica visível', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'reduzidas');
  for (const el of await page.locator(ALVOS).all()) await expect(el).toHaveCSS('opacity', '1');
});

test('animações rodam e terminam com todo o conteúdo visível', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  for (const el of await page.locator(ALVOS).all()) await expect(el).toHaveCSS('opacity', '1');
});

test('navegar e voltar reinicia as animações sem acumular gatilhos nem erros', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '1');
  const gatilhosIniciais = await html.getAttribute('data-gatilhos');

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Coleções' }).click();
  await expect(page).toHaveURL(/\/colecoes$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '2');
  await expect(page.locator('.card-colecao').first()).toHaveCSS('opacity', '1');

  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '3');
  await expect(html).toHaveAttribute('data-gatilhos', gatilhosIniciais!);
  await expect(page.locator('[data-letra]').last()).toHaveCSS('opacity', '1');
  expect(erros).toEqual([]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test tests/e2e/animacoes.spec.ts`
Expected: FAIL (`data-animacoes` não existe em `<html>`).

- [ ] **Step 3: Implementar os módulos de animação**

`src/scripts/animacoes/capa.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

/** Entrada da capa: letras sobem, foto é "revelada", chamadas deslizam. */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    if (!document.querySelector('.capa')) return;
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .from('[data-letra]', { yPercent: 110, opacity: 0, duration: 1.1, stagger: 0.06 })
      .from('.capa__foto', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2 }, '-=0.8')
      .from('[data-chamada]', { x: -30, opacity: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');
  });
  return () => ctx.revert();
}
```

`src/scripts/animacoes/revelar.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

/** Elementos sobem e aparecem ao entrar na tela (uma vez só). */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="revelar"]').forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
  });
  return () => ctx.revert();
}
```

`src/scripts/animacoes/parallax.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

/** A foto desliza dentro da moldura enquanto a página rola. */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="parallax"]').forEach((moldura) => {
      const img = moldura.querySelector('img');
      if (!img) return;
      gsap.fromTo(
        img,
        { yPercent: -6, scale: 1.12 },
        { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: moldura, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    });
  });
  return () => ctx.revert();
}
```

`src/scripts/animacoes/processo.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

/** Desktop: a imagem presa (sticky) dá zoom-out e o texto aparece conforme a rolagem. */
export function iniciar(gsap: typeof GSAP): () => void {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    gsap.utils.toArray<HTMLElement>('.processo__passo').forEach((passo) => {
      const img = passo.querySelector('.processo__figura img');
      const texto = passo.querySelector('.processo__texto');
      if (img) {
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: passo, start: 'top bottom', end: 'center center', scrub: true } });
      }
      if (texto) {
        gsap.from(texto, { opacity: 0, y: 60, ease: 'power2.out', scrollTrigger: { trigger: passo, start: 'top 70%', end: 'top 30%', scrub: true } });
      }
    });
  });
  return () => mm.revert();
}
```

`src/scripts/animacoes/linha.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

/** A linha do tempo se "desenha" conforme a rolagem (variável CSS --progresso). */
export function iniciar(gsap: typeof GSAP): () => void {
  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-anim="linha"]').forEach((linha) => {
      gsap.fromTo(
        linha,
        { '--progresso': 0 },
        { '--progresso': 1, ease: 'none', scrollTrigger: { trigger: linha, start: 'top 75%', end: 'bottom 60%', scrub: true } },
      );
    });
  });
  return () => ctx.revert();
}
```

`src/scripts/animacoes/index.ts`:
```ts
import type { gsap as GSAP } from 'gsap';

type Modulo = { iniciar: (gsap: typeof GSAP) => () => void };

let limpezas: Array<() => void> = [];
let ciclo = 0;

function limpar() {
  limpezas.forEach((f) => f());
  limpezas = [];
}

async function iniciar() {
  limpar();
  const meuCiclo = ++ciclo;
  const raiz = document.documentElement;
  raiz.dataset.animacoesCiclo = String(meuCiclo);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    raiz.dataset.animacoes = 'reduzidas';
    return;
  }
  if (!document.querySelector('[data-anim], [data-letra]')) {
    raiz.dataset.animacoes = 'sem-alvos';
    return;
  }

  // GSAP só é baixado quando há algo para animar.
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);
  const modulos: Modulo[] = await Promise.all([
    import('./capa'),
    import('./revelar'),
    import('./parallax'),
    import('./processo'),
    import('./linha'),
  ]);
  if (meuCiclo !== ciclo) return; // outra navegação começou enquanto carregava

  limpezas = modulos.map((m) => m.iniciar(gsap));
  ScrollTrigger.refresh();
  raiz.dataset.animacoes = 'ativas';
  raiz.dataset.gatilhos = String(ScrollTrigger.getAll().length);
}

// astro:page-load dispara no primeiro carregamento e a cada navegação do ClientRouter.
document.addEventListener('astro:page-load', () => void iniciar());
document.addEventListener('astro:before-swap', limpar);
```

`src/scripts/virada.ts`:
```ts
/** Transição "virar a página" da revista para o ClientRouter (keyframes em global.css). */
export const virada = {
  forwards: {
    old: { name: 'virar-sai', duration: '0.45s', easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fillMode: 'both' },
    new: { name: 'virar-entra', duration: '0.55s', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'both' },
  },
  backwards: {
    old: { name: 'virar-sai-volta', duration: '0.45s', easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fillMode: 'both' },
    new: { name: 'virar-entra-volta', duration: '0.55s', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'both' },
  },
};
```

- [ ] **Step 4: Ligar no layout e no CSS**

Em `src/layouts/Revista.astro`, adicione o import no frontmatter, logo abaixo de `import site from '../data/site.json';`:
```astro
import { virada } from '../scripts/virada';
```
e troque o bloco do `<main>` e o fim do `<body>`:
```astro
    <main id="conteudo" transition:animate={virada}>
      <slot />
    </main>
    <Expediente />
    <script>
      import '../scripts/animacoes/index.ts';
    </script>
  </body>
```

No final de `src/styles/global.css`:
```css
@keyframes virar-sai { to { opacity: 0; transform: perspective(1400px) rotateY(16deg) translateX(-6%); } }
@keyframes virar-entra { from { opacity: 0; transform: perspective(1400px) rotateY(-12deg) translateX(8%); } }
@keyframes virar-sai-volta { to { opacity: 0; transform: perspective(1400px) rotateY(-16deg) translateX(6%); } }
@keyframes virar-entra-volta { from { opacity: 0; transform: perspective(1400px) rotateY(12deg) translateX(-8%); } }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx playwright test tests/e2e/animacoes.spec.ts`
Expected: PASS nos dois projetos.

- [ ] **Step 6: Rodar a suíte inteira (nada regrediu)**

Run: `npm test && npx playwright test`
Expected: tudo PASS.

- [ ] **Step 7: Conferência visual**

Run: `npm run dev`. Na capa, as letras sobem uma a uma, a foto se revela e as chamadas deslizam. Ao clicar em "Coleções", a página "vira". No Processo, a imagem dá zoom-out enquanto rola. Ative "reduzir movimento" no sistema (Windows: Configurações → Acessibilidade → Efeitos visuais → Efeitos de animação desligado) e confira que tudo aparece parado.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: animações editoriais com GSAP e transição de virada de página

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Varredura de qualidade (links, acessibilidade, celular, Lighthouse) e guia de conteúdo

**Files:**
- Create: `tests/e2e/qualidade.spec.ts`, `docs/como-editar-conteudo.md`
- Modify: qualquer componente onde a varredura apontar problema (correções pontuais)

**Interfaces:**
- Consumes: todas as rotas e `coletarErros` (Task 10).
- Produces: suíte de qualidade e guia para o Gabriel.

- [ ] **Step 1: Instalar o axe**

```bash
npm install -D @axe-core/playwright@4.13.0
```

- [ ] **Step 2: Escrever os testes**

`tests/e2e/qualidade.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { coletarErros } from './utils';

const ROTAS = [
  '/',
  '/colecoes',
  '/colecoes/aurora',
  '/colecoes/concreto',
  '/pecas/vestido-aurora',
  '/pecas/macacao-ponte',
  '/processo',
  '/sobre',
];

for (const rota of ROTAS) {
  test(`${rota}: sem rolagem horizontal`, async ({ page }) => {
    await page.goto(rota);
    const cabe = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(cabe).toBe(true);
  });

  test(`${rota}: sem violações graves de acessibilidade (WCAG AA)`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // avalia o estado final, não o meio de uma animação
    await page.goto(rota);
    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = resultado.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    expect(graves).toEqual([]);
  });

  test(`${rota}: sem erros no console`, async ({ page }) => {
    const erros = coletarErros(page);
    await page.goto(rota);
    await page.waitForLoadState('networkidle');
    expect(erros).toEqual([]);
  });
}

test('todos os links internos respondem 200', async ({ page }) => {
  const visitadas = new Set<string>();
  const fila = ['/'];
  const quebrados: string[] = [];
  while (fila.length) {
    const rota = fila.shift()!;
    if (visitadas.has(rota)) continue;
    visitadas.add(rota);
    const resposta = await page.request.get(rota);
    if (!resposta.ok()) {
      quebrados.push(`${rota} → ${resposta.status()}`);
      continue;
    }
    if (!(resposta.headers()['content-type'] ?? '').includes('text/html')) continue;
    await page.goto(rota);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of hrefs) fila.push(href.split('#')[0] || '/');
  }
  expect(quebrados).toEqual([]);
  expect(visitadas.has('/cv-beatriz.pdf')).toBe(true);
});

test('cada página tem título próprio', async ({ page }) => {
  const titulos = new Set<string>();
  for (const rota of ROTAS) {
    await page.goto(rota);
    titulos.add(await page.title());
  }
  expect(titulos.size).toBe(ROTAS.length);
});
```

- [ ] **Step 3: Rodar**

Run: `npx playwright test tests/e2e/qualidade.spec.ts`
Expected: PASS. Se falhar, corrija **a causa** no componente apontado e rode de novo. Exemplos: contraste baixo → ajuste a cor do texto/fundo usando os tokens; rolagem horizontal → reduza `clamp`/larguras e nunca use `overflow-x: hidden` no body; link quebrado → corrija o `href`. Registre cada correção no commit.

- [ ] **Step 4: Lighthouse (meta ≥ 90)**

Em um terminal: `npm run build && npm run preview -- --host 127.0.0.1` (deixe rodando). Em outro:
```bash
export CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")"
npx -y lighthouse http://127.0.0.1:4321/ --only-categories=performance,accessibility --chrome-flags="--headless=new" --output=json --output-path=./lighthouse-capa.json --quiet
npx -y lighthouse http://127.0.0.1:4321/pecas/vestido-aurora --only-categories=performance,accessibility --chrome-flags="--headless=new" --output=json --output-path=./lighthouse-peca.json --quiet
node -e "for (const f of ['capa','peca']) { const r = require('./lighthouse-' + f + '.json'); console.log(f, Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]))); }"
```
Expected: `performance` e `accessibility` ≥ 90 nas duas páginas. Se a performance ficar abaixo, confira primeiro: a foto da capa com `loading="eager"` e `fetchpriority="high"`, `sizes` coerentes e nenhuma imagem acima de 1400px servida no mobile.

- [ ] **Step 5: Escrever o guia de conteúdo**

`docs/como-editar-conteudo.md`:
````md
# Como editar o conteúdo do site da Beatriz

Tudo que muda com frequência fica em `src/content/`, `src/data/site.json` e `public/`. Não é preciso mexer em componentes.

## Adicionar uma peça
1. Crie a pasta `src/content/pecas/<nome-da-peca>/` (sem acentos, com hífens). O nome vira a URL: `/pecas/<nome-da-peca>`.
2. Coloque as fotos em JPG ou PNG dentro dela. Fotos HEIC do iPhone precisam ser convertidas para JPG antes.
3. Crie `index.md` copiando o de `macacao-ponte` (mínimo) ou o de `vestido-aurora` (com galeria e processo).
4. `colecao:` precisa ser o nome de um arquivo de `src/content/colecoes/` (sem `.md`).
5. Toda foto precisa de um texto alternativo (`capaAlt`, `alt`) que descreva a imagem para quem não enxerga.
6. Rode `npm run dev` e confira. Se faltar algum campo, o terminal diz qual.

## Trocar placeholders por fotos reais
Substitua o arquivo mantendo o mesmo nome (ex.: `capa.jpg`). O comando `npm run placeholders` **nunca** sobrescreve arquivos existentes. Ele só recria o que estiver faltando.

## Nova coleção
Crie `src/content/colecoes/<nome>.md` com `nome`, `cor` (hex **entre aspas**, ex.: `"#ff2e88"`), `ordem`, `ano`, `resumo` e um texto curto abaixo do `---`.

## Sobre, currículo e contatos
- Entrevista, trajetória e habilidades: `src/content/sobre/sobre.md`. Em trabalho atual, use `fim: null`.
- Retrato: `src/content/sobre/retrato.jpg`.
- CV em PDF: substitua `public/cv-beatriz.pdf`.
- WhatsApp, e-mail, Instagram, edição da capa e chamadas: `src/data/site.json`.
- Imagem de prévia de link: `src/assets/og-padrao.jpg` (1200×630).

## Antes de publicar
`npm run build && npm test && npx playwright test`. Tudo verde = pode publicar a pasta `dist/` (Netlify ou Vercel). Atualize `site` em `astro.config.mjs` com a URL final.
````

- [ ] **Step 6: Verificação final completa**

Run: `npm run build && npm test && npx playwright test`
Expected: `astro check` com 0 erros, build concluído, todos os testes unitários e e2e PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: varredura de qualidade (links, a11y, celular) e guia de conteúdo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
