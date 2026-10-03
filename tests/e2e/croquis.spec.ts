import { test, expect, type Page } from '@playwright/test';

const LOOKS = Array.from({ length: 9 }, (_, i) => `Look 0${i + 1}`);

async function abrirGrade(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/croquis');
}

test('lista os 9 looks na ordem, cada um com 1 a 4 cores principais', async ({ page }) => {
  await abrirGrade(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Croquis');
  await expect(page.locator('[data-croqui] .croqui__rotulo')).toHaveText(LOOKS);
  for (const card of await page.locator('[data-croqui]').all()) {
    const n = await card.locator('[data-amostra]').count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(4);
  }
});

test('faixa da coleção tem uma faixa por cor de todas as paletas', async ({ page }) => {
  await abrirGrade(page);
  const totalCores = await page.locator('[data-amostra]').count();
  expect(totalCores).toBeGreaterThanOrEqual(9);
  await expect(page.locator('.faixa > span')).toHaveCount(totalCores);
});

test('tocar numa cor destaca a área dela no croqui e tocar de novo desliga', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').first();
  const amostra = card.locator('[data-amostra]').first();
  const chave = (await amostra.getAttribute('data-amostra'))!;

  await amostra.click();
  await expect(amostra).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.croqui__palco')).toHaveAttribute('data-destacando', '');
  const realce = card.locator('.croqui__realce.ativo');
  await expect(realce).toHaveCount(1);
  await expect(realce).toHaveAttribute('data-realce', chave);
  await expect(realce).toHaveCSS('opacity', '1');
  const mascara = await realce.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.maskImage || s.webkitMaskImage;
  });
  expect(mascara).toContain(`mascara-${chave}`);
  const url = mascara.match(/url\("?([^")]+)"?\)/)![1];
  const resposta = await page.request.get(new URL(url).pathname);
  expect(resposta.ok()).toBe(true);
  expect(resposta.headers()['content-type']).toContain('image/png');

  await amostra.click();
  await expect(amostra).toHaveAttribute('aria-pressed', 'false');
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(0);
});

test('tocar em outra cor do mesmo croqui troca o destaque (só um ativo)', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').first();
  const [a1, a2] = [card.locator('[data-amostra]').nth(0), card.locator('[data-amostra]').nth(1)];
  await a1.click();
  await a2.click();
  await expect(a1).toHaveAttribute('aria-pressed', 'false');
  await expect(a2).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(1);
  await expect(card.locator('.croqui__realce.ativo')).toHaveAttribute('data-realce', (await a2.getAttribute('data-amostra'))!);
});

test('teclado: focar uma cor destaca, sair volta ao normal', async ({ page }) => {
  await abrirGrade(page);
  const card = page.locator('[data-croqui]').nth(1);
  const amostra = card.locator('[data-amostra]').first();
  await amostra.focus();
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(1);
  await amostra.evaluate((el) => (el as HTMLElement).blur());
  await expect(card.locator('.croqui__realce.ativo')).toHaveCount(0);
});

test('o palco tem a proporção exata do desenho (máscara alinhada)', async ({ page }) => {
  await abrirGrade(page);
  await expect(page.locator('[data-croqui]')).toHaveCount(9);
  for (const card of await page.locator('[data-croqui]').all()) {
    await card.scrollIntoViewIfNeeded();
    const [caixa, natural] = await card.locator('.croqui__base').evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const r = img.getBoundingClientRect();
      return [r.width / r.height, img.naturalWidth / img.naturalHeight];
    });
    expect(Math.abs(caixa - natural) / natural).toBeLessThan(0.01);
  }
});

test('com movimento reduzido: grade com todas as paletas visíveis', async ({ page }) => {
  await abrirGrade(page);
  const secao = page.locator('section.lineup');
  await expect(secao).not.toHaveClass(/lineup--desfile|lineup--carrossel/);
  expect(await page.locator('.lineup__trilho').evaluate((el) => getComputedStyle(el).display)).toBe('grid');
  for (const a of await page.locator('[data-amostra]').all()) await expect(a).toBeVisible();
});

test('o menu leva à página de croquis', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Croquis' }),
  ).toHaveAttribute('href', '/croquis');
});

const numeroEmFoco = (page: Page) =>
  page.locator('[data-croqui][data-em-foco] .croqui__rotulo').textContent().then((t) => Number(t?.replace(/\D/g, '')));

test('desktop: a fila desfila com a rolagem e o look em foco muda', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no celular é carrossel');
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  await expect(page.locator('section.lineup')).toHaveClass(/lineup--desfile/);
  await page.locator('section.lineup').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
  await expect(page.locator('[data-croqui][data-em-foco]')).toHaveCount(1);
  const inicio = await numeroEmFoco(page);
  await page.evaluate(() => window.scrollBy(0, 4000));
  await expect.poll(() => numeroEmFoco(page)).toBeGreaterThan(inicio);
});

test('celular: deslizar o carrossel troca o look em foco', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'no desktop é desfile');
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  await expect(page.locator('section.lineup')).toHaveClass(/lineup--carrossel/);
  await page.locator('.lineup__trilho').scrollIntoViewIfNeeded();
  await expect.poll(() => numeroEmFoco(page)).toBe(1);
  await page.locator('.lineup__trilho').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect.poll(() => numeroEmFoco(page)).toBe(9);
});

test('navegar e voltar não acumula gatilhos do desfile', async ({ page }) => {
  await page.goto('/croquis');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-animacoes', 'ativas');
  const gatilhos = await html.getAttribute('data-gatilhos');
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Coleções' }).click();
  await expect(page).toHaveURL(/\/colecoes$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/croquis$/);
  await expect(html).toHaveAttribute('data-animacoes-ciclo', '3');
  await expect(html).toHaveAttribute('data-gatilhos', gatilhos!);
  await expect(page.locator('[data-croqui][data-em-foco]')).toHaveCount(1);
});

test('desktop: Tab até uma cor de um look distante leva a fila até ele sem desalinhar o desfile', async ({ page, isMobile }) => {
  test.skip(isMobile, 'só no desfile');
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  const secao = page.locator('section.lineup');
  await secao.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
  await page.locator('#look-07 [data-amostra]').first().focus();
  await expect.poll(() => numeroEmFoco(page)).toBe(7);
  expect(await secao.evaluate((el) => el.scrollLeft)).toBe(0);
  const caixa = await page.locator('#look-07').boundingBox();
  const largura = page.viewportSize()!.width;
  expect(caixa!.x).toBeGreaterThanOrEqual(0);
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(largura);
  // rolar até o fim do desfile continua mostrando o último look
  await page.evaluate(() => window.scrollBy(0, 6000));
  await page.evaluate(() => window.scrollBy(0, -400));
  await expect.poll(() => numeroEmFoco(page)).toBeGreaterThanOrEqual(8);
});

for (const [w, h] of [[1280, 720], [1920, 1080], [1024, 768]]) {
  test(`desktop ${w}x${h}: o primeiro e o último look chegam ao centro e ficam em foco`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'só no desfile');
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/croquis');
    await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
    const centroDe = (sel: string) =>
      page.locator(sel).evaluate((el) => {
        const r = el.querySelector('.croqui__palco')!.getBoundingClientRect();
        return r.left + r.width / 2;
      });
    const topo = await page.locator('section.lineup').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), topo);
    await expect.poll(() => numeroEmFoco(page)).toBe(1);
    expect(Math.abs((await centroDe('#look-01')) - w / 2)).toBeLessThan(w * 0.03);
    await page.evaluate(() => window.scrollBy(0, 20000));
    await expect.poll(() => numeroEmFoco(page)).toBe(9);
    await expect.poll(async () => Math.abs((await centroDe('#look-09')) - w / 2)).toBeLessThan(w * 0.03);
  });
}

test('desktop em tela baixa: a paleta do look em foco cabe na tela', async ({ page, isMobile }) => {
  test.skip(isMobile, 'só no desfile');
  for (const [w, h] of [[1280, 560], [1366, 650]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/croquis');
    await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
    await page.locator('section.lineup').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
    await page.evaluate(() => window.scrollBy(0, 300));
    const ultima = page.locator('[data-croqui][data-em-foco] [data-amostra]').last();
    await expect(ultima).toHaveCount(1);
    const caixa = await ultima.boundingBox();
    expect(caixa!.y + caixa!.height, `${w}x${h}`).toBeLessThanOrEqual(h);
  }
});

/** Espera a fila parar de andar (no celular, um toque durante a rolagem só a interrompe). */
async function filaParada(page: Page) {
  const posicao = () =>
    page.evaluate(() => `${Math.round(window.scrollY)}:${Math.round(document.querySelector('.lineup__trilho')!.scrollLeft)}`);
  let antes = '';
  await expect
    .poll(async () => {
      const agora = await posicao();
      const parou = agora === antes;
      antes = agora;
      return parou;
    }, { intervals: [150] })
    .toBe(true);
}

async function abrirDesfile(page: Page) {
  await page.goto('/croquis');
  await expect(page.locator('html')).toHaveAttribute('data-animacoes', 'ativas');
  const topo = await page.locator('section.lineup').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), topo);
  await expect.poll(() => numeroEmFoco(page)).toBe(1);
}

test('cores de um look fora de foco ficam travadas: não destacam nem selecionam', async ({ page }) => {
  await abrirDesfile(page);
  await expect(page.locator('#look-01 [data-amostra]').first()).toHaveAttribute('aria-disabled', 'false');
  const travada = page.locator('#look-02 [data-amostra]').first();
  await expect(travada).toHaveAttribute('aria-disabled', 'true');
  await travada.dispatchEvent('click');
  await expect(travada).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#look-02 .croqui__palco')).not.toHaveAttribute('data-destacando', '');
});

test('tocar num look fora de foco leva a fila até ele e libera as cores com animação', async ({ page }) => {
  await abrirDesfile(page);
  await page.locator('#look-02 [data-amostra]').first().dispatchEvent('click');
  await expect.poll(() => numeroEmFoco(page)).toBe(2);
  const cor = page.locator('#look-02 [data-amostra]').first();
  await expect(cor).toHaveAttribute('aria-disabled', 'false');
  await expect(cor).toHaveAttribute('aria-pressed', 'false'); // o toque só trouxe o look
  expect(await cor.locator('.amostra__bola').evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
  await filaParada(page);
  await cor.click();
  await expect(cor).toHaveAttribute('aria-pressed', 'true');
});

test('só uma cor fica selecionada e ela se solta quando o look sai de foco', async ({ page }) => {
  await abrirDesfile(page);
  const cor1 = page.locator('#look-01 [data-amostra]').first();
  await cor1.click();
  await expect(cor1).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#look-02 [data-amostra]').first().dispatchEvent('click');
  await expect.poll(() => numeroEmFoco(page)).toBe(2);
  await expect(cor1).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#look-01 .croqui__realce.ativo')).toHaveCount(0);
  await expect(page.locator('[data-amostra][aria-pressed="true"]')).toHaveCount(0);
});

test('desktop: ir até um look distante é um movimento suave, não um salto', async ({ page, isMobile }) => {
  test.skip(isMobile, 'só no desfile');
  await abrirDesfile(page);
  const posicoes = page.evaluate(
    () =>
      new Promise<number[]>((ok) => {
        const lista: number[] = [];
        const inicio = performance.now();
        const passo = () => {
          lista.push(window.scrollY);
          if (performance.now() - inicio < 1500) requestAnimationFrame(passo);
          else ok(lista);
        };
        requestAnimationFrame(passo);
      }),
  );
  await page.locator('#look-06 [data-amostra]').first().dispatchEvent('click');
  const lista = await posicoes;
  await expect.poll(() => numeroEmFoco(page)).toBe(6);
  const distintas = new Set(lista.map((y) => Math.round(y))).size;
  expect(distintas, `posições: ${distintas}`).toBeGreaterThan(15);
});
