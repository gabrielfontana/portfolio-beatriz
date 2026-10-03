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
