import { describe, it, expect } from 'vitest';
import { ordenarColecoes, pecasDaColecao, pecaDeCapa } from '../../src/lib/colecoes';

const peca = (id: string, colecao: string, ano: number, destaque = false) => ({
  id,
  data: { titulo: id, ano, destaque, colecao: { id: colecao } },
});

describe('ordenarColecoes', () => {
  it('ordena pelo campo ordem sem alterar o array original', () => {
    const original = [{ id: 'b', data: { ordem: 2 } }, { id: 'a', data: { ordem: 1 } }];
    expect(ordenarColecoes(original).map((c) => c.id)).toEqual(['a', 'b']);
    expect(original[0].id).toBe('b');
  });
});

describe('pecasDaColecao', () => {
  it('filtra pela coleção e ordena da mais recente para a mais antiga, empatando pelo título', () => {
    const pecas = [
      peca('saia', 'aurora', 2025),
      peca('blazer', 'concreto', 2026),
      peca('vestido', 'aurora', 2026),
      peca('blusa', 'aurora', 2025),
    ];
    expect(pecasDaColecao(pecas, 'aurora').map((p) => p.id)).toEqual(['vestido', 'blusa', 'saia']);
  });
  it('retorna lista vazia para coleção sem peças', () => {
    expect(pecasDaColecao([peca('x', 'aurora', 2026)], 'concreto')).toEqual([]);
  });
});

describe('pecaDeCapa', () => {
  it('prefere a peça marcada como destaque', () => {
    const pecas = [peca('nova', 'a', 2026), peca('estrela', 'a', 2024, true)];
    expect(pecaDeCapa(pecas)?.id).toBe('estrela');
  });
  it('sem destaque, usa a mais recente', () => {
    expect(pecaDeCapa([peca('velha', 'a', 2020), peca('nova', 'a', 2026)])?.id).toBe('nova');
  });
  it('lista vazia retorna undefined', () => {
    expect(pecaDeCapa([])).toBeUndefined();
  });
});
