import { describe, it, expect } from 'vitest';
import { linkWhatsApp, linkInstagram } from '../../src/lib/contato';

describe('linkWhatsApp', () => {
  it('aceita número com máscara brasileira e adiciona o 55', () => {
    expect(linkWhatsApp('(11) 98765-4321')).toBe('https://wa.me/5511987654321');
  });
  it('aceita número já com +55 e espaços', () => {
    expect(linkWhatsApp('+55 11 98765-4321')).toBe('https://wa.me/5511987654321');
  });
  it('aceita fixo de 10 dígitos', () => {
    expect(linkWhatsApp('11 3456-7890')).toBe('https://wa.me/551134567890');
  });
  it('codifica a mensagem', () => {
    expect(linkWhatsApp('11987654321', 'Olá, Beatriz!')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Beatriz!',
    );
  });
  it('recusa número curto demais com mensagem clara', () => {
    expect(() => linkWhatsApp('123')).toThrow('Telefone inválido para WhatsApp: "123"');
  });
});

describe('linkInstagram', () => {
  it('remove o @ do usuário', () => {
    expect(linkInstagram('@beatriz.modelista')).toBe('https://instagram.com/beatriz.modelista');
  });
  it('funciona sem @', () => {
    expect(linkInstagram('beatriz.modelista')).toBe('https://instagram.com/beatriz.modelista');
  });
});
