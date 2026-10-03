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
