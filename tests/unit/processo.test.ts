import { describe, it, expect } from 'vitest';
import { etapasEmOrdem } from '../../src/lib/processo';

describe('etapasEmOrdem', () => {
  it('retorna as 4 etapas na ordem do ateliê, com número e rótulo', () => {
    const etapas = etapasEmOrdem({
      final: { texto: 'd' }, costura: { texto: 'c' }, croqui: { texto: 'a' }, molde: { texto: 'b' },
    });
    expect(etapas.map((e) => [e.numero, e.rotulo, e.texto])).toEqual([
      ['01', 'Croqui', 'a'],
      ['02', 'Molde', 'b'],
      ['03', 'Corte e costura', 'c'],
      ['04', 'Peça pronta', 'd'],
    ]);
  });
});
