import { describe, it, expect } from 'vitest';
import { camadaLapis, ehPapel, mapaDeTempo, pintarQuadro } from '../../src/lib/ao-vivo';

describe('camadaLapis', () => {
  it('área chapada vira papel e borda vira traço', () => {
    // chapado: cinza 80 com vizinhança igual (invertido borrado = 175) → branco
    // borda: cinza 80 com vizinhança clara (invertido borrado ≈ 40) → escuro
    const saida = camadaLapis(new Uint8Array([80, 80]), new Uint8Array([175, 40]));
    expect(saida[0]).toBe(255);
    expect(saida[1]).toBeLessThan(20);
  });
});

describe('ehPapel', () => {
  it('reconhece papel claro e recusa cor de roupa', () => {
    expect(ehPapel(245, 244, 240)).toBe(true);
    expect(ehPapel(200, 40, 40)).toBe(false);
    expect(ehPapel(60, 60, 60)).toBe(false);
  });
});

describe('mapaDeTempo', () => {
  const largura = 70;
  const altura = 99;
  const rgb = new Uint8Array(largura * altura * 3).fill(250);
  // um "vestido" vermelho no meio
  for (let y = 30; y < 70; y++) for (let x = 20; x < 50; x++) rgb.set([190, 40, 40], (y * largura + x) * 3);
  const mapa = mapaDeTempo(rgb, largura, altura);
  const lapis = (x: number, y: number) => mapa[(y * largura + x) * 3];
  const cor = (x: number, y: number) => mapa[(y * largura + x) * 3 + 1];

  it('o lápis desce: em média, o topo vem antes da base', () => {
    let topo = 0;
    let base = 0;
    for (let x = 0; x < largura; x++) {
      topo += lapis(x, 2);
      base += lapis(x, altura - 3);
    }
    expect(topo).toBeLessThan(base);
  });

  it('o papel só muda no fim; a roupa é colorida antes', () => {
    expect(cor(5, 5)).toBeGreaterThanOrEqual(Math.round(0.86 * 255));
    expect(cor(35, 50)).toBeLessThanOrEqual(Math.round(0.85 * 255));
  });

  it('é determinístico', () => {
    expect(mapaDeTempo(rgb, largura, altura)).toEqual(mapa);
  });
});

describe('pintarQuadro', () => {
  const px = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255]);
  const cor = px(200, 0, 0);
  const lapis = px(50, 50, 50);
  const mapa = new Uint8ClampedArray([100, 100, 0, 255]);

  it('no início é papel; no meio, lápis; no fim, cor', () => {
    const saida = new Uint8ClampedArray(4);
    pintarQuadro(saida, cor, lapis, mapa, 0, 0);
    expect([...saida.slice(0, 3)]).toEqual([255, 255, 255]);
    pintarQuadro(saida, cor, lapis, mapa, 1, 0);
    expect([...saida.slice(0, 3)]).toEqual([50, 50, 50]);
    pintarQuadro(saida, cor, lapis, mapa, 1, 1);
    expect([...saida.slice(0, 3)]).toEqual([200, 0, 0]);
  });
});
