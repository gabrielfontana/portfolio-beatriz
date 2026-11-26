import { test, expect } from '@playwright/test';

test('navegação principal leva às seções da página', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link')).toHaveText(['Sobre', 'Croquis', 'Contato']);
  await expect(nav.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '#sobre');
  await expect(nav.getByRole('link', { name: 'Croquis' })).toHaveAttribute('href', '#croquis');
  await expect(nav.getByRole('link', { name: 'Contato' })).toHaveAttribute('href', '#contato');
  for (const id of ['sobre', 'croquis', 'contato']) await expect(page.locator(`#${id}`)).toHaveCount(1);
});

test('o menu leva ao contato, no fim da página', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Contato' }).click();
  await expect(page).toHaveURL(/#contato$/);
  await expect(page.getByRole('heading', { name: 'Vamos conversar?' })).toBeInViewport();
});

test('contato traz os contatos clicáveis', async ({ page }) => {
  await page.goto('/');
  const contato = page.locator('#contato');
  await expect(contato.getByRole('link', { name: '(19) 99833-8584' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/5519998338584\?text=/,
  );
  await expect(contato.getByRole('link', { name: 'beatrizchiusipintos@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:beatrizchiusipintos@gmail.com',
  );
  await expect(contato.getByRole('link', { name: '@biachiusi' })).toHaveAttribute('href', 'https://instagram.com/biachiusi');
  await expect(contato.getByText(/Direção criativa/)).toHaveCount(0);
});

test('metadados para prévia de link (WhatsApp/redes)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Beatriz Chiusi');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /modelista/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Beatriz Chiusi');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https:\/\/.+\.jpg$/);
  const resposta = await page.request.get(new URL(og!).pathname);
  expect(resposta.ok()).toBe(true);
});

test('as páginas antigas não existem mais', async ({ page }) => {
  for (const rota of ['/sobre', '/croquis', '/colecoes', '/processo', '/pecas/vestido-aurora']) {
    expect((await page.request.get(rota)).status(), rota).toBe(404);
  }
});
