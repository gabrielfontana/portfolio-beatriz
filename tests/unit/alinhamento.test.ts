import { describe, it, expect } from 'vitest';
import { centroDaCabeca, enquadrar } from '../../src/lib/alinhamento';

/** Faixa de `linhas` linhas com pixels escuros nas colunas [de, ate). */
function faixa(largura: number, linhas: number, de: number, ate: number) {
  const cinza = new Uint8Array(largura * linhas).fill(255);
  for (let y = 0; y < linhas; y++) for (let x = de; x < ate; x++) cinza[y * largura + x] = 20;
  return cinza;
}

describe('centroDaCabeca', () => {
  it('é a média das colunas escuras', () => {
    expect(centroDaCabeca(faixa(100, 5, 60, 70), 100, 5)).toBeCloseTo(64.5);
  });

  it('sem pixels escuros, usa o meio', () => {
    expect(centroDaCabeca(new Uint8Array(100 * 5).fill(255), 100, 5)).toBe(50);
  });
});

describe('enquadrar', () => {
  it('põe a cabeça no centro do quadro', () => {
    const e = enquadrar(400, 150, 1000);
    expect(e.esquerda + 150).toBe(500);
    expect(e.recorteX).toBe(0);
    expect(e.larguraVisivel).toBe(400);
  });

  it('corta o que passa da borda esquerda (bolsa muito aberta)', () => {
    const e = enquadrar(1200, 700, 1000);
    expect(e.esquerda).toBe(0);
    expect(e.recorteX).toBe(200);
    expect(e.larguraVisivel).toBe(1000);
  });

  it('corta o que passa da borda direita', () => {
    const e = enquadrar(900, 100, 1000);
    expect(e.esquerda).toBe(400);
    expect(e.larguraVisivel).toBe(600);
  });
});
