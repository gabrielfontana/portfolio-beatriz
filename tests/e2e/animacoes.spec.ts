import { test, expect } from '@playwright/test';
import { coletarErros } from './utils';

const ALVOS = '[data-letra], [data-chamada], [data-anim="revelar"]';

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

test('navegar e voltar reinicia as animações sem acumular gatilhos nem erros', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '1');
  const gatilhosIniciais = await html.getAttribute('data-gatilhos');

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Coleções' }).click();
  await expect(page).toHaveURL(/\/colecoes$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '2');
  await expect(page.locator('.card-colecao').first()).toHaveCSS('opacity', '1');

  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '3');
  await expect(html).toHaveAttribute('data-gatilhos', gatilhosIniciais!);
  await expect(page.locator('[data-letra]').last()).toHaveCSS('opacity', '1');
  expect(erros).toEqual([]);
});
