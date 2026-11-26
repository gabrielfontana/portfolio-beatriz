import { test, expect, type Page, type Locator } from '@playwright/test';
import { coletarErros } from './utils';

async function abrir(page: Page, opcoes: { reduzido?: boolean } = {}) {
  if (opcoes.reduzido) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-croquis', 'pronto');
}

/** Rola até o elemento ficar logo abaixo do menu e das abas. */
async function rolarAte(page: Page, seletor: string, folga = 140) {
  await page.locator(seletor).first().evaluate((el, f) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - f), folga);
}

/** Toque/clique conforme o projeto (no celular, toque de verdade). */
async function tocar(page: Page, alvo: Locator, isMobile: boolean) {
  if (isMobile) await alvo.tap();
  else await alvo.click();
}

/** Arrasto de dedo sintético (pointer events de toque) sobre um elemento. */
async function arrastar(alvo: Locator, deFracao: number, ateFracao: number) {
  await alvo.evaluate(
    (el, [de, ate]) => {
      const r = el.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const ev = (tipo: string, x: number) =>
        el.dispatchEvent(new PointerEvent(tipo, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true, pointerId: 9, isPrimary: true }));
      ev('pointerdown', r.left + r.width * de);
      ev('pointermove', r.left + r.width * ((de + ate) / 2));
      ev('pointermove', r.left + r.width * ate);
      ev('pointerup', r.left + r.width * ate);
    },
    [deFracao, ateFracao],
  );
}

const lookAtual = (manequim: Locator) =>
  manequim.locator('[data-ir]').evaluateAll((pontos) => pontos.findIndex((p) => p.getAttribute('aria-current') === 'true'));

// ---------------------------------------------------------------- estrutura

test('título, três seções com divisão escrita e abas que levam a cada uma', async ({ page }) => {
  await abrir(page);
  const secao = page.locator('#croquis');
  await expect(secao.getByRole('heading', { level: 2 })).toHaveText('Croquis');
  await expect(secao.getByRole('heading', { level: 3 })).toHaveText(['Desenhados no Sketchbook', 'Desenhados à mão', 'Estudos no Sketchbook']);
  const abas = page.getByRole('navigation', { name: 'Seções da página' });
  await expect(abas.getByRole('link', { name: 'Sketchbook' })).toHaveAttribute('href', '#sketchbook');
  await expect(abas.getByRole('link', { name: 'À mão' })).toHaveAttribute('href', '#a-mao');
  await expect(abas.getByRole('link', { name: 'Estudos' })).toHaveAttribute('href', '#estudos');
  // logo do app nas seções do Sketchbook
  await expect(page.locator('#sketchbook .capitulo__titulo img')).toBeVisible();
  // nenhum nome de pasta aparece na página
  for (const nome of ['anos 70', 'look completo', 'looks históricos', 'looks separados']) {
    await expect(page.getByText(nome, { exact: false })).toHaveCount(0);
  }
});

test('as abas ficam presas (abaixo do menu no desktop; no topo no celular) e marcam a seção na tela', async ({ page, isMobile }) => {
  await abrir(page);
  await page.getByRole('navigation', { name: 'Seções da página' }).getByRole('link', { name: 'Estudos' }).click();
  await expect(page.locator('[data-aba="estudos"]')).toHaveAttribute('aria-current', 'true');
  const menu = (await page.locator('.nav').boundingBox())!;
  const abas = (await page.locator('.abas').boundingBox())!;
  // no celular o menu rola junto (não ocupa a tela) e as abas ficam coladas no topo
  if (isMobile) {
    expect(menu.y + menu.height).toBeLessThanOrEqual(0);
    expect(Math.abs(abas.y)).toBeLessThan(2);
  } else {
    expect(menu.y).toBe(0);
    expect(Math.abs(abas.y - (menu.y + menu.height))).toBeLessThan(3);
  }
  await rolarAte(page, '#sketchbook', 0);
  await expect(page.locator('[data-aba="sketchbook"]')).toHaveAttribute('aria-current', 'true');
});

// ---------------------------------------------------------------- provador

test('provador: três manequins (um por pose), 21 looks, um vestido em cada', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('[data-manequim]')).toHaveCount(3);
  await expect(page.locator('[data-croqui]')).toHaveCount(21);
  await expect(page.locator('[data-croqui][data-atual]')).toHaveCount(3);
  const pontos = await page.locator('[data-manequim]').evaluateAll((ms) => ms.map((m) => m.querySelectorAll('[data-ir]').length));
  expect(pontos.reduce((a, b) => a + b, 0)).toBe(21);
  // só o look vestido aparece e recebe foco
  for (const m of await page.locator('[data-manequim]').all()) {
    await expect(m.locator('.croqui__palco:visible')).toHaveCount(1);
    await expect(m.locator('[data-croqui]:not([data-atual])').first()).toHaveJSProperty('inert', true);
  }
});

test('provador: próximo troca a roupa caindo de cima; anterior volta subindo', async ({ page }) => {
  await abrir(page);
  await rolarAte(page, '#sketchbook', 60);
  const m = page.locator('[data-manequim]').first();
  await m.locator('[data-proximo]').click();
  await expect(m.locator('.croqui__palco.caindo')).toHaveCount(1); // no meio da troca
  await expect.poll(() => lookAtual(m)).toBe(1);
  await expect(m.locator('.croqui__palco.caindo')).toHaveCount(0, { timeout: 3000 });
  await expect(m.locator('.provador__brilho')).toHaveCount(0);
  await m.locator('[data-anterior]').click();
  await expect(m.locator('.croqui__palco.subindo')).toHaveCount(1);
  await expect.poll(() => lookAtual(m)).toBe(0);
});

test('provador: tocar na figura troca para o próximo look', async ({ page, isMobile }) => {
  await abrir(page);
  await rolarAte(page, '#sketchbook', 60);
  const m = page.locator('[data-manequim]').nth(1);
  await tocar(page, m.locator('[data-croqui][data-atual] .croqui__palco'), isMobile);
  await expect.poll(() => lookAtual(m)).toBe(1);
});

test('provador: arrastar para o lado vai para o próximo e volta', async ({ page }) => {
  await abrir(page);
  await rolarAte(page, '#sketchbook', 60);
  const m = page.locator('[data-manequim]').nth(2);
  await arrastar(m.locator('[data-croqui][data-atual] .croqui__palco'), 0.8, 0.2);
  await expect.poll(() => lookAtual(m)).toBe(1);
  await arrastar(m.locator('[data-croqui][data-atual] .croqui__palco'), 0.2, 0.8);
  await expect.poll(() => lookAtual(m)).toBe(0);
});

test('provador: bolinha leva ao look e setas do teclado trocam', async ({ page }) => {
  await abrir(page);
  const m = page.locator('[data-manequim]').first();
  await m.locator('[data-ir="4"]').click();
  await expect.poll(() => lookAtual(m)).toBe(4);
  await expect(m.locator('[data-ir="4"]')).toHaveAccessibleName('Look 05');
  await m.locator('[data-proximo]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => lookAtual(m)).toBe(3);
});

test('provador: a cor do look vestido destaca, e se solta quando o look troca', async ({ page }) => {
  await abrir(page);
  const m = page.locator('[data-manequim]').first();
  const look = m.locator('[data-croqui][data-atual]');
  const amostra = look.locator('[data-amostra]').first();
  const chave = (await amostra.getAttribute('data-amostra'))!;
  await amostra.click();
  await expect(amostra).toHaveAttribute('aria-pressed', 'true');
  await expect(look.locator('.croqui__palco')).toHaveAttribute('data-destacando', '');
  const realce = look.locator('.croqui__realce.ativo');
  await expect(realce).toHaveAttribute('data-realce', chave);
  const mascara = await realce.evaluate((el) => getComputedStyle(el).maskImage);
  const url = mascara.match(/url\("?([^")]+)"?\)/)![1];
  expect((await page.request.get(new URL(url).pathname)).ok()).toBe(true);
  // trocar de look solta a cor
  await m.locator('[data-proximo]').click();
  await expect(page.locator('[data-amostra][aria-pressed="true"]')).toHaveCount(0);
});

test('provador: o palco tem a proporção do desenho (máscara alinhada) e todos os croquis o mesmo quadro', async ({ page }) => {
  await abrir(page);
  for (const img of await page.locator('[data-croqui][data-atual] .croqui__base').all()) {
    const [caixa, natural] = await img.evaluate(async (el: HTMLImageElement) => {
      await el.decode();
      const r = el.getBoundingClientRect();
      return [r.width / r.height, el.naturalWidth / el.naturalHeight];
    });
    expect(Math.abs(caixa - natural) / natural).toBeLessThan(0.01);
    expect(natural).toBeCloseTo(2 / 3, 2);
  }
});

test('provador com movimento reduzido: a troca é instantânea', async ({ page }) => {
  await abrir(page, { reduzido: true });
  const m = page.locator('[data-manequim]').first();
  await m.locator('[data-proximo]').click();
  expect(await lookAtual(m)).toBe(1);
  await expect(m.locator('.croqui__palco.caindo')).toHaveCount(0);
});

test('provador: a figura cabe na tela com as setas embaixo', async ({ page }) => {
  await abrir(page);
  await rolarAte(page, '[data-manequim]', 120);
  const altura = page.viewportSize()!.height;
  const setas = (await page.locator('[data-manequim]').first().locator('[data-proximo]').boundingBox())!;
  expect(setas.y + setas.height).toBeLessThanOrEqual(altura);
});

// ---------------------------------------------------------------- à mão: desenho ao vivo

test('desenho ao vivo: desenha quando aparece e fica pronto mesmo rolando para longe', async ({ page }) => {
  await abrir(page);
  const fig = page.locator('[data-ao-vivo]').first();
  await expect(fig).toHaveClass(/ao-vivo--preparado/);
  await rolarAte(page, '[data-ao-vivo]', 110);
  await expect(fig).toHaveAttribute('data-desenhado', '', { timeout: 6000 });
  await expect(fig).not.toHaveClass(/ao-vivo--preparado/);
  await expect(fig.locator('.ao-vivo__final')).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await rolarAte(page, '[data-ao-vivo]', 110);
  await expect(fig).toHaveAttribute('data-desenhado', '');
  await expect(fig).not.toHaveClass(/ao-vivo--preparado/);
});

test('desenho ao vivo no desktop: as fichas técnicas chegam logo, mesmo numa rolagem rápida', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no celular as fichas ficam embaixo do croqui e entram quando aparecem');
  await abrir(page);
  const fig = page.locator('[data-ao-vivo]').nth(1);
  // só a pontinha da seção aparece
  await fig.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight + (el as HTMLElement).offsetHeight * 0.2));
  await page.waitForTimeout(900);
  for (const ficha of await fig.locator('.ao-vivo__ficha').all()) {
    await expect(ficha).toHaveCSS('opacity', '1');
  }
});

test('desenho ao vivo: a mesa de luz vai de ponta a ponta da tela', async ({ page }) => {
  await abrir(page);
  const [esquerda, largura, tela] = await page
    .locator('[data-ao-vivo]')
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.width, document.documentElement.clientWidth];
    });
  expect(esquerda).toBe(0);
  expect(Math.abs(largura - tela)).toBeLessThan(1);
});

test('desenho ao vivo no celular: as fichas só entram quando elas mesmas aparecem na tela', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'layout empilhado do celular');
  await abrir(page);
  for (const indice of [0, 1]) {
    const fig = page.locator('[data-ao-vivo]').nth(indice);
    const fichas = fig.locator('.ao-vivo__ficha');
    // as fichas logo abaixo da borda da tela (o croqui à vista): elas continuam esperando
    await fig.locator('.ao-vivo__fichas').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight + 4));
    await page.waitForTimeout(900);
    await expect(fichas.first()).toHaveCSS('opacity', '0');
    // rolando até as fichas, elas entram e terminam no lugar, à vista
    await fig.locator('.ao-vivo__fichas').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    for (const ficha of await fichas.all()) await expect(ficha).toHaveCSS('opacity', '1');
    await expect(fichas.first()).toBeInViewport();
  }
});

test('desenho ao vivo com movimento reduzido: já aparece pronto', async ({ page }) => {
  await abrir(page, { reduzido: true });
  const fig = page.locator('[data-ao-vivo]').first();
  await expect(fig).not.toHaveClass(/ao-vivo--preparado/);
  await expect(fig.locator('.ao-vivo__final')).toHaveCSS('opacity', '1');
  for (const ficha of await fig.locator('.ao-vivo__ficha').all()) await expect(ficha).toHaveCSS('opacity', '1');
});

// ---------------------------------------------------------------- à mão: mural

test('mural: rascunhos a lápis por último e sem o filtro de grafite; sapato deitado', async ({ page }) => {
  await abrir(page);
  const tipos = await page.locator('[data-varal] [data-grupo]').evaluateAll((gs) => gs.map((g) => (g as HTMLElement).dataset.tipo));
  const primeiroRascunho = tipos.indexOf('rascunho');
  expect(primeiroRascunho).toBeGreaterThan(0);
  expect(tipos.slice(primeiroRascunho).every((t) => t === 'rascunho')).toBe(true);
  const rascunho = page.locator('[data-grupo][data-tipo="rascunho"] img').first();
  expect(await rascunho.evaluate((el) => getComputedStyle(el).filter)).toBe('none');
  const sapato = (await page.locator('#sapato').boundingBox())!;
  expect(sapato.width).toBeGreaterThan(sapato.height);
});

test('mural: todas as folhas ficam à mostra, sem rolar para o lado, com os rascunhos embaixo dos coloridos', async ({ page }) => {
  await abrir(page);
  const mural = page.locator('[data-varal]');
  const caixa = (await mural.boundingBox())!;
  const grupos = mural.locator('[data-grupo]');
  await expect(grupos).toHaveCount(12);
  for (const g of await grupos.all()) {
    const b = (await g.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(caixa.x);
    expect(b.x + b.width).toBeLessThanOrEqual(caixa.x + caixa.width);
  }
  expect(await mural.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  // sem bilhete nem legenda: os rascunhos só ficam embaixo dos coloridos
  await expect(mural.getByText('rascunhos', { exact: false })).toHaveCount(0);
  const fundoColoridos = await mural
    .locator('[data-tipo="colorido"]')
    .evaluateAll((gs) => Math.max(...gs.map((g) => g.getBoundingClientRect().bottom)));
  const rascunho = (await mural.locator('[data-tipo="rascunho"]').first().boundingBox())!;
  expect(rascunho.y).toBeGreaterThan(fundoColoridos);
});

test('visualizador: ao trocar de folha, a nova já chega pintada e nenhuma carta fica transparente', async ({ page, isMobile }) => {
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  // grava, a cada quadro, se a imagem nova já estava decodificada e a opacidade das cartas
  await page.evaluate(() => {
    type Quadro = { pronta: boolean; opacas: boolean };
    const w = window as unknown as { registro: Quadro[] };
    w.registro = [];
    const cor = document.querySelector<HTMLImageElement>('#visualizador [data-cor]')!;
    const quadro = () => {
      const cartas = document.querySelectorAll<HTMLElement>('#visualizador [data-folha], #visualizador [data-folha-velha]');
      w.registro.push({
        pronta: cor.complete && cor.naturalWidth > 0,
        opacas: [...cartas].every((c) => getComputedStyle(c).opacity === '1'),
      });
      if (w.registro.length < 150) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  });
  for (const [tecla, texto] of [['ArrowRight', 'Folha 2 de 3'], ['ArrowLeft', 'Folha 1 de 3']] as const) {
    await page.keyboard.press(tecla);
    await expect(contador(page)).toHaveText(texto);
    await page.waitForTimeout(1300); // a troca é lenta de propósito (~1 s)
  }
  const registro = await page.evaluate(() => (window as unknown as { registro: Array<{ pronta: boolean; opacas: boolean }> }).registro);
  expect(registro.every((q) => q.pronta)).toBe(true);
  // transparência por cima da outra carta era o "fantasma"
  expect(registro.every((q) => q.opacas)).toBe(true);
  await expect(page.locator('#visualizador [data-folha-velha]')).toHaveCount(0);
});

test('visualizador: fechar e abrir outro desenho nunca mostra a folha do desenho anterior', async ({ page, isMobile }) => {
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  await page.keyboard.press('ArrowRight'); // folheia: ao fechar, o mural põe a folha 2 no topo e ela voa para lá
  await expect(contador(page)).toHaveText('Folha 2 de 3');
  await expect(page.locator('#visualizador [data-folha-velha]')).toHaveCount(0); // fim da troca
  await page.locator('#visualizador [data-fechar]').click();
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', false);
  // ao fechar, o visualizador fica vazio
  await expect(page.locator('#visualizador [data-cor]')).not.toHaveAttribute('src', /.+/);
  // grava, a cada quadro com o visualizador aberto, qual imagem está nele e se já está pintável
  await page.evaluate(() => {
    const w = window as unknown as { quadros: Array<{ src: string; pronta: boolean }> };
    w.quadros = [];
    const visor = document.querySelector<HTMLDialogElement>('#visualizador')!;
    const cor = visor.querySelector<HTMLImageElement>('[data-cor]')!;
    const quadro = () => {
      if (visor.open) w.quadros.push({ src: cor.getAttribute('src') ?? '', pronta: cor.complete && cor.naturalWidth > 0 });
      if (w.quadros.length < 40) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  });
  const esperada = await page.locator('#looks-historicos').evaluate((g) => JSON.parse((g as HTMLElement).dataset.folhas!)[0].src as string);
  await abrirGrupo(page, '#looks-historicos', isMobile);
  await esperarVoo(page);
  const quadros = await page.evaluate(() => (window as unknown as { quadros: Array<{ src: string; pronta: boolean }> }).quadros);
  expect(quadros.length).toBeGreaterThan(0);
  expect(quadros.filter((q) => q.src !== esperada || !q.pronta)).toEqual([]);
});

test('mural: fechar o visualizador em outra folha deixa essa folha no topo da pilha', async ({ page, isMobile }) => {
  await abrir(page);
  const grupo = page.locator('#anos-70');
  const imagens = () => grupo.locator('.folha img').evaluateAll((is) => is.map((i) => (i as HTMLImageElement).src));
  const [original1, original2, original3] = await imagens(); // [topo, 2ª, 3ª]
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  await page.keyboard.press('ArrowRight');
  await expect(contador(page)).toHaveText('Folha 2 de 3');
  await expect(page.locator('#visualizador [data-folha-velha]')).toHaveCount(0); // fim da troca
  await page.locator('#visualizador [data-fechar]').click();
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', false);
  // a folha 2 está no topo e as outras seguem atrás, na ordem do grupo
  expect(await imagens()).toEqual([original2, original3, original1]);
  await expect(grupo.locator('.folha--topo')).toBeVisible();
  // e reabrir o grupo começa por ela
  await abrirGrupo(page, '#anos-70', isMobile);
  await expect(contador(page)).toHaveText('Folha 2 de 3');
});

test('visualizador: folhear é como um baralho (a carta torta endireita aos poucos e a de cima vai para baixo do monte)', async ({ page, isMobile }) => {
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  const angulo = (sel: string) =>
    page.locator(sel).evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    });
  const tortaAntes = await angulo('#visualizador [data-proxima]');
  expect(tortaAntes).toBeGreaterThan(2); // a próxima espia torta atrás
  await page.keyboard.press('ArrowRight');
  const velha = page.locator('#visualizador [data-folha-velha]');
  await expect(velha).toHaveCount(1);
  // congela a troca em alguns instantes e mede as duas cartas
  const quadros = await page.evaluate(() => {
    const v = document.querySelector<HTMLElement>('#visualizador [data-folha-velha]')!;
    const f = document.querySelector<HTMLElement>('#visualizador [data-folha]')!;
    const anims = [...v.getAnimations(), ...f.getAnimations()];
    const ang = (el: HTMLElement) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    };
    return [0, 250, 750].map((t) => {
      anims.forEach((a) => {
        a.pause();
        a.currentTime = t;
      });
      return {
        t,
        novaAngulo: ang(f),
        velhaX: new DOMMatrix(getComputedStyle(v).transform).e,
        velhaPorCima: Number(getComputedStyle(v).zIndex) > Number(getComputedStyle(f).zIndex),
      };
    });
  });
  const [inicio, puxando, guardando] = quadros;
  // a carta que espiava começa exatamente torta como estava (nada de endireitar do nada) e endireita aos poucos
  expect(inicio.novaAngulo).toBeCloseTo(tortaAntes, 1);
  expect(guardando.novaAngulo).toBeLessThan(inicio.novaAngulo);
  expect(guardando.novaAngulo).toBeGreaterThan(0);
  // a de cima é puxada para a esquerda por cima e depois vai para baixo do monte
  expect(puxando.velhaX).toBeLessThan(0);
  expect(puxando.velhaPorCima).toBe(true);
  expect(guardando.velhaPorCima).toBe(false);
  await page.evaluate(() => document.querySelectorAll<HTMLElement>('#visualizador [data-folha-velha], #visualizador [data-folha]').forEach((e) => e.getAnimations().forEach((a) => a.play())));
  await expect(velha).toHaveCount(0);
  expect(Math.abs(await angulo('#visualizador [data-folha]'))).toBeLessThan(0.01); // terminou reta
  await expect(page.locator('#visualizador [data-proxima]')).toBeVisible();
});

test('mural: os desenhos coloridos já aparecem com cor, sem passar por preto e branco ao rolar', async ({ page }) => {
  await abrir(page);
  const mural = page.locator('[data-varal]');
  const semFiltro = () =>
    mural.locator('[data-tipo="colorido"] img').evaluateAll((is) =>
      is.every((i) => getComputedStyle(i).filter === 'none' && getComputedStyle(i).clipPath === 'none'),
    );
  expect(await semFiltro()).toBe(true); // antes de chegar ao mural
  await rolarAte(page, '[data-varal]', 200);
  expect(await semFiltro()).toBe(true); // e ao chegar
  await expect(mural.locator('[data-revelada]')).toHaveCount(0);
});

// ---------------------------------------------------------------- visualizador

async function abrirGrupo(page: Page, seletor: string, isMobile: boolean) {
  await rolarAte(page, '[data-varal]', 200);
  const grupo = page.locator(seletor);
  await grupo.evaluate((el) => el.scrollIntoView({ inline: 'center', block: 'nearest' }));
  await page.waitForTimeout(300);
  await tocar(page, grupo, isMobile);
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', true);
  return grupo;
}
const contador = (page: Page) => page.locator('#visualizador [data-contador]');
/** Espera a folha do visualizador parar de animar (voo de abrir ou troca de folha). */
async function esperarVoo(page: Page) {
  await expect.poll(() => page.locator('#visualizador [data-folha]').evaluate((el) => el.getAnimations().length)).toBe(0);
}

test('visualizador: abre com o voo, a folha some do varal e volta ao fechar (Esc)', async ({ page, isMobile }) => {
  await abrir(page);
  const grupo = await abrirGrupo(page, '#anos-70', isMobile);
  await expect(contador(page)).toHaveText('Folha 1 de 3');
  await expect(grupo.locator('.folha--topo')).toHaveCSS('visibility', 'hidden');
  // página por trás desfocada (não preta)
  expect(await page.locator('#visualizador [data-fundo]').evaluate((el) => getComputedStyle(el).backdropFilter)).toContain('blur');
  await page.keyboard.press('Escape');
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', false);
  await expect(grupo.locator('.folha--topo')).toHaveCSS('visibility', 'visible');
});

test('visualizador: próxima folha espiando, miniaturas e setas do teclado', async ({ page, isMobile }) => {
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  const espiando = (await page.locator('#visualizador [data-proxima]').boundingBox())!;
  const ponto = { x: espiando.x + espiando.width - 10, y: espiando.y + espiando.height * 0.3 };
  if (isMobile) await page.touchscreen.tap(ponto.x, ponto.y);
  else await page.mouse.click(ponto.x, ponto.y);
  await expect(contador(page)).toHaveText('Folha 2 de 3');
  await page.locator('#visualizador [data-miniaturas] button').nth(2).click();
  await expect(contador(page)).toHaveText('Folha 3 de 3');
  await expect(page.locator('#visualizador [data-miniaturas] button').nth(2)).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(contador(page)).toHaveText('Folha 1 de 3');
});

test('visualizador: a folha preenche a mesa com a proporção da imagem (sem faixas brancas)', async ({ page, isMobile }) => {
  await abrir(page, { reduzido: true });
  await abrirGrupo(page, '#anos-70', isMobile);
  const [caixa, natural] = await page.locator('#visualizador [data-cor]').evaluate(async (el: HTMLImageElement) => {
    await el.decode();
    const r = el.getBoundingClientRect();
    return [r.width / r.height, el.naturalWidth / el.naturalHeight];
  });
  expect(Math.abs(caixa - natural) / natural).toBeLessThan(0.02);
});

test('estudos no celular: ao seguir as anotações, a prancha aproximada e os botões ficam à vista', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'layout empilhado do celular');
  await abrir(page, { reduzido: true });
  await rolarAte(page, '[data-estudo][data-atual] [data-proxima]', 300);
  await page.locator('[data-estudo][data-atual] [data-proxima]').tap();
  const abas = (await page.locator('.abas').boundingBox())!;
  const quadro = (await page.locator('[data-estudo][data-atual] [data-quadro]').boundingBox())!;
  const botao = (await page.locator('[data-estudo][data-atual] [data-proxima]').boundingBox())!;
  expect(quadro.y).toBeGreaterThanOrEqual(abas.y + abas.height - 2);
  expect(botao.y + botao.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('visualizador no celular: arrastar troca de folha; segurar liga a lupa', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'gestos de toque');
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  const palco = page.locator('#visualizador [data-palco]');
  await arrastar(palco, 0.75, 0.25);
  await expect(contador(page)).toHaveText('Folha 2 de 3');
  await expect(page.locator('#visualizador [data-lupa]')).not.toHaveClass(/ativa/);
  await expect(page.locator('#visualizador [data-folha-velha]')).toHaveCount(0); // fim da troca
  // segurar parado
  const caixa = (await page.locator('#visualizador [data-folha]').boundingBox())!;
  await palco.evaluate(
    (el, [x, y]) => el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', clientX: x, clientY: y, bubbles: true, pointerId: 4 })),
    [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2],
  );
  await expect(page.locator('#visualizador [data-lupa]')).toHaveClass(/ativa/);
});

test('visualizador no desktop: a lupa segue o mouse e fica por cima da folha', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse');
  await abrir(page);
  await abrirGrupo(page, '#anos-70', isMobile);
  await esperarVoo(page);
  const caixa = (await page.locator('#visualizador [data-folha]').boundingBox())!;
  await page.mouse.move(caixa.x + caixa.width * 0.4, caixa.y + caixa.height * 0.4);
  await page.mouse.move(caixa.x + caixa.width * 0.5, caixa.y + caixa.height * 0.45, { steps: 3 });
  const lupa = page.locator('#visualizador [data-lupa]');
  await expect(lupa).toHaveClass(/ativa/);
  const z = await lupa.evaluate((el) => Number(getComputedStyle(el).zIndex));
  const zFolha = await page.locator('#visualizador [data-folha]').evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(z).toBeGreaterThan(zFolha);
});

test('visualizador: rascunho a lápis não tem o controle traço ↔ cor; colorido tem', async ({ page, isMobile }) => {
  await abrir(page);
  await abrirGrupo(page, '#rascunho-1', isMobile);
  await expect(page.locator('#visualizador [data-corte-rotulo]')).toBeHidden();
  await expect(page.locator('#visualizador [data-proxima]')).toBeHidden(); // uma folha só
  await page.keyboard.press('Escape');
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', false);
  await abrirGrupo(page, '#anos-70', isMobile);
  await expect(page.locator('#visualizador [data-corte-rotulo]')).toBeVisible();
});

test('desenho ao vivo: tocar numa ficha abre o visualizador nela', async ({ page, isMobile }) => {
  await abrir(page, { reduzido: true });
  await rolarAte(page, '[data-ao-vivo]', 110);
  // as fichas ficam em leque: a de trás aparece pela borda esquerda
  const ficha = page.locator('[data-ao-vivo]').first().locator('[data-abrir="1"]');
  const posicao = { x: 12, y: 60 };
  if (isMobile) await ficha.tap({ position: posicao });
  else await ficha.click({ position: posicao });
  await expect(page.locator('#visualizador')).toHaveJSProperty('open', true);
  await expect(contador(page)).toHaveText('Folha 2 de 3');
});

// ---------------------------------------------------------------- estudos

test('estudos: nenhuma anotação na tela, só a prancha e os botões', async ({ page }) => {
  await abrir(page);
  await rolarAte(page, '#estudos', 100);
  const estudo = page.locator('[data-estudo][data-atual]');
  await expect(estudo.locator('[data-ponto]:visible')).toHaveCount(0);
  await estudo.locator('[data-proxima]').click();
  await expect(estudo.locator('[data-ponto]:visible')).toHaveCount(0);
  // o texto da anotação não aparece em lugar nenhum
  await expect(page.getByText('cintura', { exact: false })).toHaveCount(0);
  await expect(estudo.getByRole('button')).toHaveText(['Anterior', 'Próximo', 'Ver a prancha inteira']);
});

test('estudos: "Começar" aproxima a primeira anotação, que fica dentro do quadro', async ({ page }) => {
  await abrir(page);
  await rolarAte(page, '#estudos', 100);
  const estudo = page.locator('[data-estudo][data-atual]');
  await estudo.locator('[data-proxima]').click();
  await expect(estudo.locator('[data-contador]')).toHaveText('Detalhe 1 de 6');
  await page.waitForTimeout(900); // fim do zoom
  // posição da anotação depois do zoom, em px dentro do quadro
  const { escala, x, y, largura, altura } = await estudo.locator('[data-camada]').evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const ponto = el.querySelector<HTMLElement>('[data-ponto="0"]')!;
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      escala: m.a,
      x: (parseFloat(ponto.style.left) / 100) * w * m.a + m.e,
      y: (parseFloat(ponto.style.top) / 100) * h * m.d + m.f,
      largura: w,
      altura: h,
    };
  });
  expect(escala).toBeGreaterThan(2);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThanOrEqual(largura);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(y).toBeLessThanOrEqual(altura);
  await estudo.locator('[data-inteira]').click();
  await expect(estudo.locator('[data-contador]')).toHaveText('Prancha inteira');
  await expect(estudo.locator('[data-proxima]')).toHaveText('Começar');
});

test('estudos: miniatura troca de estudo; prancha deitada mantém a proporção', async ({ page }) => {
  await abrir(page);
  await page.locator('[data-seletor] [data-ir="3"]').click();
  await expect(page.locator('[data-estudo][data-atual]')).toHaveAttribute('id', 'estudo-4');
  await expect(page.locator('[data-estudo]:visible')).toHaveCount(1);
  const proporcao = await page.locator('[data-estudo][data-atual] [data-quadro]').evaluate((el) => el.clientWidth / el.clientHeight);
  expect(proporcao).toBeCloseTo(1600 / 1200, 1);
});

test('estudos: "Próximo" percorre tudo e passa para o próximo estudo', async ({ page }) => {
  await abrir(page);
  const proxima = page.locator('[data-estudo][data-atual] [data-proxima]');
  for (let i = 0; i < 7; i++) await proxima.click(); // Começar + 6 anotações
  await expect(page.locator('[data-estudo][data-atual]')).toHaveAttribute('id', 'estudo-2');
});

// ---------------------------------------------------------------- sem JS, navegação, erros

test('sem JS: todos os looks em grade, desenhos prontos e todas as pranchas de estudo', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('[data-provador]')).not.toHaveClass(/provador--ativo/);
  await expect(page.locator('.croqui__palco:visible')).toHaveCount(21);
  await expect(page.locator('.ao-vivo__final').first()).toBeVisible();
  await expect(page.locator('[data-estudo]:visible')).toHaveCount(7);
  await expect(page.locator('[data-estudo] [data-proxima]:visible')).toHaveCount(0);
  await ctx.close();
});

test('o menu leva aos croquis e o provador funciona sem erros', async ({ page }) => {
  const erros = coletarErros(page);
  await abrir(page);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Croquis' }).click();
  await expect(page).toHaveURL(/#croquis$/);
  await expect(page.locator('#croquis').getByRole('heading', { level: 2 })).toBeInViewport();
  await expect(page.locator('html')).toHaveAttribute('data-croquis', 'pronto');
  const m = page.locator('[data-manequim]').first();
  await m.locator('[data-proximo]').click();
  await expect.poll(() => lookAtual(m)).toBe(1);
  expect(erros).toEqual([]);
});

test('as imagens publicadas são as geradas pelo npm run croquis (quadro comum 2:3), não o original do app', async ({ page, request }) => {
  await abrir(page);
  const src = await page.locator('[data-croqui][data-atual] .croqui__base').first().getAttribute('src');
  const resposta = await request.get(src!);
  expect(resposta.ok()).toBe(true);
  // a marca d'água em si é verificada no teste unitário de comMarca
  const tamanho = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, src!);
  expect(tamanho[0] / tamanho[1]).toBeCloseTo(2 / 3, 2);
});
