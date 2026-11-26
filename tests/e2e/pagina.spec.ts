import { test, expect } from '@playwright/test';

test('a página segue a ordem sobre → croquis → contato', async ({ page }) => {
  await page.goto('/');
  const ordem = await page.locator('#sobre, #croquis, #contato').evaluateAll((els) => els.map((el) => el.id));
  expect(ordem).toEqual(['sobre', 'croquis', 'contato']);
});

test('o trecho do sobre apresenta a Beatriz com as habilidades', async ({ page }) => {
  await page.goto('/');
  const sobre = page.locator('#sobre');
  await expect(sobre.getByRole('heading', { level: 1 })).toHaveText('Beatriz Chiusi');
  await expect(sobre.getByRole('img')).toHaveAttribute('alt', /Retrato de Beatriz/);
  await expect(sobre.getByRole('list', { name: 'Habilidades' }).getByRole('listitem')).toContainText(['Modelagem plana', 'Moulage']);
});

test('botão baixa o currículo em PDF', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Baixar currículo (PDF)' });
  await expect(link).toHaveAttribute('href', '/cv-beatriz.pdf');
  await expect(link).toHaveAttribute('download', '');
  const r = await page.request.get('/cv-beatriz.pdf');
  expect(r.ok()).toBe(true);
  expect((await r.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
