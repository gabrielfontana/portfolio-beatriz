import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPaleta, medirPaleta } from '../../scripts/gerar-paletas.mjs';
import { ehPrincipal, type MedidaCor } from '../../src/lib/paleta';

const raiz = fileURLToPath(new URL('../../src/content/croquis/', import.meta.url));

describe('paletas dos croquis publicados', () => {
  for (const look of readdirSync(raiz).sort()) {
    it(`${look}: só cores principais (nem ínfimas, nem de traço/contorno)`, async () => {
      const paleta = lerPaleta(readFileSync(join(raiz, look, 'index.md'), 'utf8'));
      const medidas: MedidaCor[] = await medirPaleta(join(raiz, look, 'croqui.jpg'), paleta);
      const fora = paleta.filter((_: unknown, i: number) => !ehPrincipal(medidas[i]));
      const detalhe = medidas.map((m) => `${(m.area * 100).toFixed(1)}%/${(m.solida * 100).toFixed(2)}%`).join(' · ');
      expect(fora, detalhe).toEqual([]);
    });
  }
});
