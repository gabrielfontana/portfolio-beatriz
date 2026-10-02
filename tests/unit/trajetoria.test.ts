import { describe, it, expect } from 'vitest';
import { ordenarTrajetoria, formatarPeriodo, type ItemTrajetoria } from '../../src/lib/trajetoria';

const item = (titulo: string, inicio: number, fim: number | null): ItemTrajetoria => ({
  titulo, inicio, fim, tipo: 'experiencia', local: 'X',
});

describe('ordenarTrajetoria', () => {
  it('coloca o atual primeiro e depois pelo fim mais recente', () => {
    const itens = [item('curso', 2019, 2022), item('atual', 2024, null), item('estagio', 2022, 2024), item('oficina', 2023, 2023)];
    expect(ordenarTrajetoria(itens).map((i) => i.titulo)).toEqual(['atual', 'estagio', 'oficina', 'curso']);
  });
  it('empate no fim desempata pelo início mais recente', () => {
    const itens = [item('longo', 2018, 2024), item('curto', 2023, 2024)];
    expect(ordenarTrajetoria(itens).map((i) => i.titulo)).toEqual(['curto', 'longo']);
  });
});

describe('formatarPeriodo', () => {
  it('formata período em andamento', () => expect(formatarPeriodo(2024, null)).toBe('2024 — atual'));
  it('formata período fechado', () => expect(formatarPeriodo(2019, 2022)).toBe('2019 — 2022'));
  it('formata período de um ano só', () => expect(formatarPeriodo(2023, 2023)).toBe('2023'));
});
