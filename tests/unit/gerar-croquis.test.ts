import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { alinharCroqui, comMarca, gerarDesenho } from '../../scripts/gerar-croquis.mjs';
import { QUADRO } from '../../src/lib/alinhamento';

sharp.cache(false);

/** Imagem branca com um "corpo" escuro: cabeça em (cabecaX, 20) e tronco até embaixo. */
async function figura(largura: number, altura: number, cabecaX: number) {
  const buf = Buffer.alloc(largura * altura * 3, 255);
  const pintar = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) buf.set([30, 30, 30], (y * largura + x) * 3);
  };
  pintar(cabecaX - 12, 10, cabecaX + 12, 60); // cabeça (~13% da figura, como nos croquis)
  pintar(cabecaX - 20, 60, cabecaX + 60, altura - 10); // corpo deslocado para a direita (como uma bolsa)
  return sharp(buf, { raw: { width: largura, height: altura, channels: 3 } }).png().toBuffer();
}

async function colunasEscuras(png: Buffer, linhaDe: number, linhaAte: number) {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  let soma = 0;
  let n = 0;
  for (let y = linhaDe; y < linhaAte; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels] < 128) {
        soma += x;
        n++;
      }
    }
  }
  return soma / n;
}

describe('alinharCroqui', () => {
  it('põe a figura no quadro comum com a cabeça no centro, seja qual for a posição no original', async () => {
    for (const cabecaX of [60, 140]) {
      const saida = await alinharCroqui(await figura(240, 400, cabecaX));
      const meta = await sharp(saida).metadata();
      expect([meta.width, meta.height]).toEqual([QUADRO.largura, QUADRO.altura]);
      // a cabeça fica nas primeiras linhas da figura (margem + 7% da altura dela)
      const centro = await colunasEscuras(saida, QUADRO.margem, QUADRO.margem + Math.round(QUADRO.alturaFigura * 0.05));
      expect(Math.abs(centro - QUADRO.largura / 2)).toBeLessThan(12);
    }
  });
});

describe('comMarca', () => {
  it('grava a marca: a imagem branca fica levemente marcada, sem escurecer muito', async () => {
    const branco = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const { data } = await (await comMarca(branco)).raw().toBuffer({ resolveWithObject: true });
    let marcados = 0;
    let minimo = 255;
    for (let i = 0; i < data.length; i += 3) {
      if (data[i] < 250) marcados++;
      minimo = Math.min(minimo, data[i]);
    }
    expect(marcados / (data.length / 3)).toBeGreaterThan(0.005); // existe
    expect(minimo).toBeGreaterThan(180); // é discreta
  });
});

describe('gerarDesenho', () => {
  it('gera folha-N.jpg a partir de original-N, girando quando pedido, sem tocar no original nem no index.md', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'desenho-'));
    await sharp({ create: { width: 300, height: 420, channels: 3, background: '#fafafa' } }).jpeg().toFile(join(pasta, 'original-1.jpg'));
    const md = '---\ntitulo: Teste\nordem: 1\ntipo: colorido\nfolhas:\n  - imagem: ./folha-1.jpg\n    alt: Teste\n    girar: 270\n---\n';
    writeFileSync(join(pasta, 'index.md'), md);
    const original = readFileSync(join(pasta, 'original-1.jpg'));
    expect(await gerarDesenho(pasta)).toBe(1);
    const meta = await sharp(join(pasta, 'folha-1.jpg')).metadata();
    expect(meta.width).toBeGreaterThan(meta.height!); // deitada
    expect(readFileSync(join(pasta, 'original-1.jpg')).equals(original)).toBe(true);
    expect(readFileSync(join(pasta, 'index.md'), 'utf8')).toBe(md);
    expect(existsSync(join(pasta, 'lapis.png'))).toBe(false); // só com aoVivo
  });

  it('com aoVivo, gera as camadas do desenho ao vivo no tamanho da tela', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'desenho-'));
    await sharp({ create: { width: 700, height: 990, channels: 3, background: '#f4f4f4' } }).jpeg().toFile(join(pasta, 'original-1.jpg'));
    writeFileSync(join(pasta, 'index.md'), '---\ntitulo: T\nordem: 1\ntipo: colorido\naoVivo: true\nfolhas:\n  - imagem: ./folha-1.jpg\n    alt: T\n---\n');
    await gerarDesenho(pasta);
    for (const nome of ['lapis.png', 'tempo.png']) {
      const meta = await sharp(join(pasta, nome)).metadata();
      expect([meta.width, meta.height]).toEqual([700, 990]);
    }
  });

  it('avisa qual arquivo falta', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'desenho-'));
    writeFileSync(join(pasta, 'index.md'), '---\ntitulo: T\nordem: 1\ntipo: rascunho\nfolhas:\n  - imagem: ./folha-1.jpg\n    alt: T\n---\n');
    await expect(gerarDesenho(pasta)).rejects.toThrow(/original-1/);
  });
});
