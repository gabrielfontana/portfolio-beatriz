import { describe, it, expect } from 'vitest';
import { chaveDaCor, caminhoDaMascara, resolverMascaras, faixaDaColecao } from '../../src/lib/croquis';

describe('chaveDaCor / caminhoDaMascara', () => {
  it('remove # e normaliza para minúsculas', () => {
    expect(chaveDaCor('#BF343A')).toBe('bf343a');
    expect(caminhoDaMascara('look-03', '#BF343A')).toBe('/src/content/croquis/look-03/mascara-bf343a.png');
  });
});

describe('resolverMascaras', () => {
  const paleta = [{ hex: '#BF343A', nome: 'Vermelho' }, { hex: '#2b2626', nome: 'Preto' }];
  const mapa = {
    '/src/content/croquis/look-01/mascara-bf343a.png': 'M1',
    '/src/content/croquis/look-01/mascara-2b2626.png': 'M2',
  };
  it('associa cada cor à sua máscara, mesmo com hex em maiúsculas', () => {
    expect(resolverMascaras('look-01', paleta, mapa)).toEqual([
      { hex: '#BF343A', nome: 'Vermelho', chave: 'bf343a', mascara: 'M1' },
      { hex: '#2b2626', nome: 'Preto', chave: '2b2626', mascara: 'M2' },
    ]);
  });
  it('look sem paleta: erro claro pedindo para rodar o script', () => {
    expect(() => resolverMascaras('look-10', undefined, mapa)).toThrow('O look-10 ainda não tem paleta: rode npm run paletas');
  });
  it('máscara faltando: erro claro com a cor e o look', () => {
    expect(() => resolverMascaras('look-02', paleta, mapa)).toThrow('Falta a máscara de #BF343A em look-02: rode npm run paletas');
  });
});

describe('faixaDaColecao', () => {
  it('junta as paletas na ordem, ignorando looks sem paleta', () => {
    expect(
      faixaDaColecao([
        { paleta: [{ hex: '#111111', nome: 'a' }, { hex: '#222222', nome: 'b' }] },
        {},
        { paleta: [{ hex: '#333333', nome: 'c' }] },
      ]),
    ).toEqual(['#111111', '#222222', '#333333']);
  });
});
