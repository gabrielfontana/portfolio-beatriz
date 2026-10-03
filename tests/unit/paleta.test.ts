import { describe, it, expect } from 'vitest';
import {
  hexParaRgb, rgbParaHex, rgbParaLab, labParaRgb, deltaE, ehFundo, ehPele,
  kmeans, fundirParecidos, nomearCor, sugerirPaleta, pertenceACor, type RGB, type Lab,
} from '../../src/lib/paleta';

const lab = (hex: string) => rgbParaLab(hexParaRgb(hex));
const repetir = (hex: string, n: number): RGB[] => Array.from({ length: n }, () => hexParaRgb(hex));

describe('conversões', () => {
  it('hex ↔ rgb', () => {
    expect(hexParaRgb('#BF343A')).toEqual([191, 52, 58]);
    expect(rgbParaHex([191, 52, 58])).toBe('#bf343a');
  });
  it('rgb → Lab com valores de referência (D65)', () => {
    const [L, a, b] = lab('#ff0000');
    expect(L).toBeCloseTo(53.24, 0);
    expect(a).toBeCloseTo(80.09, 0);
    expect(b).toBeCloseTo(67.2, 0);
    expect(lab('#ffffff')[0]).toBeCloseTo(100, 0);
    expect(lab('#000000')[0]).toBeCloseTo(0, 0);
  });
  it('Lab → rgb volta à cor original', () => {
    for (const hex of ['#bf343a', '#0f74ba', '#f1bc55', '#2b2626', '#cde2f7']) {
      expect(rgbParaHex(labParaRgb(lab(hex)))).toBe(hex);
    }
  });
  it('deltaE é a distância euclidiana em Lab', () => {
    expect(deltaE([50, 0, 0], [53, 4, 0])).toBeCloseTo(5, 6);
  });
});

describe('filtros', () => {
  it('ehFundo descarta branco e cinzas claros da sombra do papel', () => {
    for (const hex of ['#ffffff', '#d4cfcd', '#c9d1d5', '#a1a6ad']) expect(ehFundo(lab(hex)), hex).toBe(true);
  });
  it('ehFundo preserva preto, cores saturadas e azul-claro', () => {
    for (const hex of ['#2b2626', '#bf343a', '#0f74ba', '#cde2f7', '#808080']) expect(ehFundo(lab(hex)), hex).toBe(false);
  });
  it('ehPele reconhece tons de pele dos croquis', () => {
    for (const hex of ['#cb9c86', '#d9aa8e', '#ba856a', '#ce9775', '#ceab9b']) expect(ehPele(hexParaRgb(hex)), hex).toBe(true);
  });
  it('ehPele não descarta roupas vermelhas, amarelas, pretas, azuis nem cabelo escuro', () => {
    for (const hex of ['#bf343a', '#f1bc55', '#2b2626', '#0f74ba', '#5e4c41', '#b76d6d']) {
      expect(ehPele(hexParaRgb(hex)), hex).toBe(false);
    }
  });
});

describe('kmeans', () => {
  const pontos: Lab[] = [
    ...Array.from({ length: 30 }, (_, i): Lab => [20 + (i % 3), 0, 0]),
    ...Array.from({ length: 10 }, (_, i): Lab => [80 + (i % 2), 10, 10]),
  ];
  it('separa grupos óbvios e ordena pelo tamanho', () => {
    const grupos = fundirParecidos(kmeans(pontos, 2));
    expect(grupos.map((g) => g.total)).toEqual([30, 10]);
    expect(grupos[0].centro[0]).toBeCloseTo(21, 0);
    expect(grupos[1].centro[0]).toBeCloseTo(80.5, 0);
  });
  it('é determinístico', () => {
    expect(kmeans(pontos, 4)).toEqual(kmeans(pontos, 4));
  });
  it('lista vazia devolve nenhum grupo', () => {
    expect(kmeans([], 6)).toEqual([]);
  });
  it('fundirParecidos junta centros quase iguais somando os totais', () => {
    const grupos = fundirParecidos([
      { centro: [50, 10, 10], total: 30 },
      { centro: [51, 11, 10], total: 10 },
      { centro: [10, 0, 0], total: 5 },
    ]);
    expect(grupos.map((g) => g.total)).toEqual([40, 5]);
  });
});

describe('nomearCor', () => {
  const casos: Array<[string, string]> = [
    ['#bf343a', 'Vermelho'], ['#ff2e88', 'Rosa'], ['#0f74ba', 'Azul'], ['#cde2f7', 'Azul-claro'],
    ['#1b2a5c', 'Azul-marinho'], ['#f1bc55', 'Amarelo'], ['#2b2626', 'Preto'], ['#ffffff', 'Branco'],
    ['#808080', 'Cinza'], ['#2e8b57', 'Verde'], ['#6b3e1f', 'Marrom'],
  ];
  for (const [hex, nome] of casos) it(`${hex} → ${nome}`, () => expect(nomearCor(lab(hex))).toBe(nome));
});

describe('sugerirPaleta', () => {
  it('ignora fundo e pele, funde quase iguais, descarta ruído e ordena por área', () => {
    const pixels = [
      ...repetir('#ffffff', 500),
      ...repetir('#cb9c86', 300),
      ...repetir('#bf343a', 400),
      ...repetir('#c0353b', 50),
      ...repetir('#0f74ba', 250),
      ...repetir('#2b2626', 200),
      ...repetir('#00ff00', 5),
    ];
    const { cores, aviso } = sugerirPaleta(pixels);
    expect(aviso).toBeUndefined();
    expect(cores.map((c) => c.nome)).toEqual(['Vermelho', 'Azul', 'Preto']);
    expect(deltaE(lab(cores[0].hex), lab('#bf343a'))).toBeLessThan(3);
    for (const c of cores) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('limita a 4 cores', () => {
    const pixels = ['#bf343a', '#0f74ba', '#f1bc55', '#2b2626', '#2e8b57', '#ff2e88'].flatMap((h, i) => repetir(h, 100 + i * 10));
    expect(sugerirPaleta(pixels).cores).toHaveLength(4);
  });
  it('avisa quando não há cores suficientes', () => {
    const { cores, aviso } = sugerirPaleta([...repetir('#ffffff', 100), ...repetir('#bf343a', 100)]);
    expect(cores).toHaveLength(1);
    expect(aviso).toMatch(/escreva a paleta à mão/);
  });
});

describe('pertenceACor', () => {
  const vermelho = lab('#bf343a');
  it('aceita pixels próximos da cor', () => expect(pertenceACor(hexParaRgb('#c43a40'), vermelho)).toBe(true));
  it('recusa fundo, pele e cores distantes', () => {
    expect(pertenceACor(hexParaRgb('#ffffff'), vermelho)).toBe(false);
    expect(pertenceACor(hexParaRgb('#cb9c86'), lab('#cb9c86'))).toBe(false);
    expect(pertenceACor(hexParaRgb('#0f74ba'), vermelho)).toBe(false);
  });
});
