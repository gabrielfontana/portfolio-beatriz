import { describe, it, expect } from 'vitest';
import { svgMarca } from '../../src/lib/marca';

describe('svgMarca', () => {
  it('tem o tamanho exato da imagem', () => {
    const svg = svgMarca(1000, 1500, 'Beatriz Chiusi');
    expect(svg).toMatch(/^<svg [^>]*width="1000" height="1500"/);
  });

  it('repete o nome e desenha a grade inclinada', () => {
    const svg = svgMarca(1000, 1500, 'Beatriz Chiusi');
    expect((svg.match(/Beatriz Chiusi/g) ?? []).length).toBeGreaterThan(20);
    expect((svg.match(/<line /g) ?? []).length).toBeGreaterThan(10);
    expect(svg).toContain('rotate(-24 500 750)');
  });

  it('cobre a imagem inteira mesmo deitada (a grade gira em volta do centro)', () => {
    const svg = svgMarca(1800, 1273, 'B');
    const xs = [...svg.matchAll(/<text x="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(1800);
  });

  it('escapa caracteres de XML no nome', () => {
    expect(svgMarca(100, 100, 'A & <B>')).toContain('A &amp; &lt;B&gt;');
  });
});
