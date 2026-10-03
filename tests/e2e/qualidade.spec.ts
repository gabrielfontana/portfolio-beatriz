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
  '/croquis',
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

test('fontes servidas pelo próprio site (sem CSS externo bloqueando a renderização)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const familias = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(familias.join(',')).toMatch(/Bodoni Moda/);
  expect(familias.join(',')).toMatch(/Inter/);
});
