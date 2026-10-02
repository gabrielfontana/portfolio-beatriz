import { test, expect } from '@playwright/test';

test('a home responde em pt-BR com o nome da Beatriz', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Beatriz');
});
