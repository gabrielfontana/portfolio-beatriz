import { describe, it, expect } from 'vitest';
import { corDeTextoSobre } from '../../src/lib/cor';

describe('corDeTextoSobre', () => {
  it('usa texto escuro sobre cores claras/vibrantes', () => {
    expect(corDeTextoSobre('#ffd400')).toBe('#141414');
    expect(corDeTextoSobre('#ff2e88')).toBe('#141414');
    expect(corDeTextoSobre('#f6efe4')).toBe('#141414');
  });
  it('usa texto branco sobre cores escuras', () => {
    expect(corDeTextoSobre('#0047ab')).toBe('#ffffff');
    expect(corDeTextoSobre('#e10600')).toBe('#ffffff');
    expect(corDeTextoSobre('#141414')).toBe('#ffffff');
  });
  it('aceita maiúsculas', () => {
    expect(corDeTextoSobre('#0047AB')).toBe('#ffffff');
  });
});
