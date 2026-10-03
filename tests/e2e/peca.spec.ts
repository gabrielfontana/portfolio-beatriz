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
