import { test, expect } from '@playwright/test';

const ALVOS = '[data-anim="revelar"]';

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

test('título já visível ao abrir a página não some nem pisca (tela de notebook baixa)', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  const h1 = page.getByRole('heading', { level: 1 });
  expect(await h1.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
