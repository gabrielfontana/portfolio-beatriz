import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gerarImagem, montarPdf } from '../../scripts/gerar-placeholders.mjs';

const opcoes = { largura: 40, altura: 60, cor: '#ff2e88', rotulo: 'A & B' };

describe('gerarImagem', () => {
  it('cria um JPG (criando pastas) quando o arquivo não existe', async () => {
    const caminho = join(mkdtempSync(join(tmpdir(), 'ph-')), 'sub', 'a.jpg');
    expect(await gerarImagem(caminho, opcoes)).toBe(true);
    const bytes = readFileSync(caminho);
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
  });

  it('nunca sobrescreve uma foto que já existe', async () => {
    const caminho = join(mkdtempSync(join(tmpdir(), 'ph-')), 'real.jpg');
    writeFileSync(caminho, 'foto real da Beatriz');
    expect(await gerarImagem(caminho, opcoes)).toBe(false);
    expect(readFileSync(caminho, 'utf8')).toBe('foto real da Beatriz');
  });
});

describe('montarPdf', () => {
  it('gera um PDF válido com a tabela xref no lugar certo', () => {
    const pdf = montarPdf(['Beatriz', 'Modelista (provisório)']).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    const inicioXref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(inicioXref, inicioXref + 4)).toBe('xref');
    expect(pdf).toContain(String.raw`(Modelista \(provisório\))`);
  });
});
