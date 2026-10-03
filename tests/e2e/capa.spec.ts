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

test('capa mostra a prancha de croquis com link para a página', async ({ page }) => {
  await page.goto('/');
  const prancha = page.locator('section.prancha');
  await expect(prancha.locator('[data-croqui-mini]')).toHaveCount(5);
  await expect(prancha.getByRole('link', { name: 'Ver a prancha completa →' })).toHaveAttribute('href', '/croquis');
});
