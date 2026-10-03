import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { processarLook, lerPaleta, inserirPaleta } from '../../scripts/gerar-paletas.mjs';

const MD = '---\ntitulo: Look 99\nordem: 99\nimagem: ./croqui.png\nalt: Teste\n---\n';

/** Croqui sintético 200×300: faixas de fundo, pele, vermelho, azul e preto. */
async function criarLook(): Promise<string> {
  const pasta = mkdtempSync(join(tmpdir(), 'look-'));
  const faixas: Array<[number, [number, number, number]]> = [
    [40, [255, 255, 255]],
    [60, [203, 156, 134]],
    [90, [191, 52, 58]],
    [60, [15, 116, 186]],
    [50, [43, 38, 38]],
  ];
  const buf = Buffer.alloc(200 * 300 * 3);
  let linha = 0;
  for (const [altura, [r, g, b]] of faixas) {
    for (let y = linha; y < linha + altura; y++) {
      for (let x = 0; x < 200; x++) buf.set([r, g, b], (y * 200 + x) * 3);
    }
    linha += altura;
  }
  await sharp(buf, { raw: { width: 200, height: 300, channels: 3 } }).png().toFile(join(pasta, 'croqui.png'));
  writeFileSync(join(pasta, 'index.md'), MD);
  return pasta;
}

async function alfa(arquivo: string, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3];
}

describe('lerPaleta / inserirPaleta', () => {
  it('insere a paleta no frontmatter preservando os outros campos', () => {
    const md = inserirPaleta(MD, [{ hex: '#bf343a', nome: 'Vermelho' }]);
    expect(lerPaleta(md)).toEqual([{ hex: '#bf343a', nome: 'Vermelho' }]);
    expect(parse(md.split('---')[1]).titulo).toBe('Look 99');
  });
  it('sem paleta devolve null', () => expect(lerPaleta(MD)).toBeNull());
});

describe('processarLook', () => {
  it('grava a paleta sugerida quando ausente e gera uma máscara por cor', async () => {
    const pasta = await criarLook();
    const r = await processarLook(pasta);
    expect(r.criada).toBe(true);
    expect(r.paleta.map((c: { nome: string }) => c.nome)).toEqual(['Vermelho', 'Azul', 'Preto']);
    expect(lerPaleta(readFileSync(join(pasta, 'index.md'), 'utf8'))).toEqual(r.paleta);
    for (const nome of r.mascaras) expect(existsSync(join(pasta, nome))).toBe(true);
    const vermelho = join(pasta, `mascara-${r.paleta[0].hex.slice(1)}.png`);
    expect(await alfa(vermelho, 100, 145)).toBe(255); // dentro do vermelho
    expect(await alfa(vermelho, 100, 20)).toBe(0); // fundo
    expect(await alfa(vermelho, 100, 70)).toBe(0); // pele
    expect(await alfa(vermelho, 100, 220)).toBe(0); // azul
  });

  it('nunca altera uma paleta escrita à mão (inclusive com hex em maiúsculas)', async () => {
    const pasta = await criarLook();
    const manual = `${MD.slice(0, -4)}paleta:\n  - hex: "#BF343A"\n    nome: Rubi\n  - hex: "#0f74ba"\n    nome: Azul\n  - hex: "#2b2626"\n    nome: Preto\n---\n`;
    writeFileSync(join(pasta, 'index.md'), manual);
    const r = await processarLook(pasta);
    expect(r.criada).toBe(false);
    expect(readFileSync(join(pasta, 'index.md'), 'utf8')).toBe(manual);
    expect(r.mascaras).toEqual(['mascara-bf343a.png', 'mascara-0f74ba.png', 'mascara-2b2626.png']);
    expect(existsSync(join(pasta, 'mascara-bf343a.png'))).toBe(true);
  });

  it('apaga máscaras de cores que saíram da paleta', async () => {
    const pasta = await criarLook();
    writeFileSync(join(pasta, 'mascara-abcdef.png'), 'velha');
    const r = await processarLook(pasta);
    expect(r.removidas).toEqual(['mascara-abcdef.png']);
    expect(existsSync(join(pasta, 'mascara-abcdef.png'))).toBe(false);
  });
});
