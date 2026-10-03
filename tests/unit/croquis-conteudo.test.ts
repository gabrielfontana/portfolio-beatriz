import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPaleta, medirAreas } from '../../scripts/gerar-paletas.mjs';
import { AREA_MINIMA } from '../../src/lib/paleta';

const raiz = fileURLToPath(new URL('../../src/content/croquis/', import.meta.url));

describe('paletas dos croquis publicados', () => {
  for (const look of readdirSync(raiz).sort()) {
    it(`${look}: só cores principais (cada uma cobre ao menos 5% da roupa)`, async () => {
      const paleta = lerPaleta(readFileSync(join(raiz, look, 'index.md'), 'utf8'));
      const areas: number[] = await medirAreas(join(raiz, look, 'croqui.jpeg'), paleta);
      const infimas = paleta.filter((_: unknown, i: number) => areas[i] < AREA_MINIMA);
      expect(infimas, areas.map((a) => (a * 100).toFixed(1)).join(' / ')).toEqual([]);
    });
  }
});
