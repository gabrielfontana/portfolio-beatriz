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
