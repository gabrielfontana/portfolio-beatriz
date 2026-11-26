import { test, expect } from '@playwright/test';
import sharp from 'sharp';

// WhatsApp só mostra miniatura de imagens leves (~300KB) e prefere o formato 1,91:1.
// Fotos menores que 1200px não são ampliadas, então vale a proporção, não o tamanho exato.
for (const rota of ['/']) {
  test(`${rota}: imagem de prévia 1,91:1, leve e com dimensões declaradas corretas`, async ({ page }) => {
    await page.goto(rota);
    const largura = Number(await page.locator('meta[property="og:image:width"]').getAttribute('content'));
    const altura = Number(await page.locator('meta[property="og:image:height"]').getAttribute('content'));
    const url = await page.locator('meta[property="og:image"]').getAttribute('content');
    const corpo = await (await page.request.get(new URL(url!).pathname)).body();
    expect(corpo.length).toBeLessThan(300 * 1024);
    const { width, height } = await sharp(corpo).metadata();
    expect([width, height]).toEqual([largura, altura]);
    expect(largura).toBeLessThanOrEqual(1200);
    expect(largura / altura).toBeCloseTo(1200 / 630, 1);
  });
}
