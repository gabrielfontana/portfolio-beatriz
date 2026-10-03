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
