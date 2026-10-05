import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { lerFrontmatter } from '../../scripts/gerar-croquis.mjs';
import { QUADRO } from '../../src/lib/alinhamento';

sharp.cache(false);
const conteudo = fileURLToPath(new URL('../../src/content/', import.meta.url));
const pastas = (colecao: string) =>
  readdirSync(join(conteudo, colecao), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(conteudo, colecao, d.name));
const original = (pasta: string, prefixo: string) => readdirSync(pasta).find((f) => new RegExp(`^${prefixo}\\.(jpe?g|png|webp)$`, 'i').test(f));

// Estes testes pegam o esquecimento de rodar `npm run croquis` depois de mexer no conteúdo.
describe('croquis do Sketchbook', () => {
  for (const pasta of pastas('croquis')) {
    it(`${pasta.split(/[\\/]/).pop()}: tem original, pose e croqui gerado no quadro comum`, async () => {
      expect(original(pasta, 'original')).toBeTruthy();
      expect(['a', 'b', 'c']).toContain(lerFrontmatter(readFileSync(join(pasta, 'index.md'), 'utf8')).pose);
      const meta = await sharp(join(pasta, 'croqui.jpg')).metadata();
      expect([meta.width, meta.height]).toEqual([QUADRO.largura, QUADRO.altura]);
    });
  }
});

describe('desenhos à mão', () => {
  for (const pasta of pastas('desenhos')) {
    it(`${pasta.split(/[\\/]/).pop()}: cada folha tem original e imagem gerada`, () => {
      const dados = lerFrontmatter(readFileSync(join(pasta, 'index.md'), 'utf8'));
      expect(dados.folhas.length).toBeGreaterThan(0);
      dados.folhas.forEach((_: unknown, i: number) => {
        expect(original(pasta, `original-${i + 1}`), `original-${i + 1}`).toBeTruthy();
        expect(existsSync(join(pasta, `folha-${i + 1}.jpg`)), `folha-${i + 1}.jpg`).toBe(true);
      });
      if (dados.aoVivo) {
        expect(existsSync(join(pasta, 'lapis.png'))).toBe(true);
        expect(existsSync(join(pasta, 'tempo.png'))).toBe(true);
      }
    });
  }
});

describe('estudos', () => {
  for (const pasta of pastas('estudos')) {
    it(`${pasta.split(/[\\/]/).pop()}: tem original, prancha gerada e anotações dentro da imagem`, () => {
      expect(original(pasta, 'original')).toBeTruthy();
      expect(existsSync(join(pasta, 'prancha.jpg'))).toBe(true);
      const { anotacoes } = lerFrontmatter(readFileSync(join(pasta, 'index.md'), 'utf8'));
      for (const a of anotacoes) {
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x).toBeLessThanOrEqual(100);
        expect(a.y).toBeGreaterThanOrEqual(0);
        expect(a.y).toBeLessThanOrEqual(100);
      }
    });
  }
});
