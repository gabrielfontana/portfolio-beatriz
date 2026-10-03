// Sugere paletas e gera máscaras de cor dos croquis.
// Regra de ouro: NUNCA altera uma paleta já escrita no index.md; máscaras são sempre regeneradas.
import sharp from 'sharp';
import { parse } from 'yaml';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AREA_MINIMA, ehPrincipal, hexParaRgb, medirCores, pertenceACor, rgbParaLab, sugerirPaleta } from '../src/lib/paleta.ts';
import { chaveDaCor } from '../src/lib/croquis.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const LARGURA_MASCARA = 600;

export function lerPaleta(md) {
  const m = md.match(FRONTMATTER);
  if (!m) throw new Error('index.md sem frontmatter (bloco entre ---)');
  const dados = parse(m[1]) ?? {};
  if (!Array.isArray(dados.paleta) || dados.paleta.length === 0) return null;
  dados.paleta.forEach((c, i) => {
    // Sem aspas, "#bf343a" vira comentário no YAML e o hex chega vazio.
    if (typeof c?.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.hex)) {
      throw new Error(`cor ${i + 1} sem hex válido — coloque entre aspas, ex.: hex: "#bf343a"`);
    }
  });
  return dados.paleta;
}

export function inserirPaleta(md, paleta) {
  const bloco = ['paleta:', ...paleta.flatMap((c) => [`  - hex: "${c.hex}"`, `    nome: ${c.nome}`])].join('\n');
  return md.replace(FRONTMATTER, (_tudo, corpo) => {
    // Remove um "paleta:" vazio (ou "paleta: []") deixado à mão, para não duplicar a chave.
    const semVazia = corpo.replace(/^paleta:[ \t]*(\[\s*\])?[ \t]*$\r?\n?/m, '').replace(/\s+$/, '');
    return `---\n${semVazia}\n${bloco}\n---`;
  });
}

function acharCroqui(pasta) {
  const nome = readdirSync(pasta).find((f) => /^croqui\.(jpe?g|png|webp)$/i.test(f));
  if (!nome) throw new Error(`${pasta}: falta o arquivo croqui.jpeg (ou .jpg/.png/.webp)`);
  return join(pasta, nome);
}

async function lerPixels(arquivo, largura) {
  const { data, info } = await sharp(arquivo)
    .rotate() // aplica a rotação EXIF de fotos de celular, como o Astro faz ao exibir
    .resize({ width: largura, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function paraRgb(data) {
  const pixels = [];
  for (let i = 0; i < data.length; i += 3) pixels.push([data[i], data[i + 1], data[i + 2]]);
  return pixels;
}

/** Área e parte sólida (sem traços) de cada cor da paleta, na mesma resolução das máscaras. */
export async function medirPaleta(arquivoCroqui, paleta) {
  const { data, info } = await lerPixels(arquivoCroqui, LARGURA_MASCARA);
  return medirCores(paraRgb(data), info.width, paleta.map((c) => c.hex));
}

export async function gerarMascara(arquivoCroqui, hex, destino) {
  const { data, info } = await lerPixels(arquivoCroqui, LARGURA_MASCARA);
  const alvo = rgbParaLab(hexParaRgb(hex));
  const rgba = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j + 3] = pertenceACor([data[i], data[i + 1], data[i + 2]], alvo) ? 255 : 0;
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1)
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

export async function processarLook(pasta) {
  const arquivoMd = join(pasta, 'index.md');
  const md = readFileSync(arquivoMd, 'utf8');
  const croqui = acharCroqui(pasta);
  let paleta = lerPaleta(md);
  let criada = false;
  let aviso;

  if (!paleta) {
    const { data, info } = await lerPixels(croqui, LARGURA_MASCARA);
    const sugestao = sugerirPaleta(paraRgb(data), info.width);
    aviso = sugestao.aviso;
    if (sugestao.cores.length) {
      paleta = sugestao.cores;
      writeFileSync(arquivoMd, inserirPaleta(md, paleta));
      criada = true;
    }
  }

  if (paleta) {
    // Paleta escrita à mão nunca é alterada: cor ínfima ou de traço só gera aviso.
    const medidas = await medirPaleta(croqui, paleta);
    const problemas = paleta.flatMap((c, i) => {
      const m = medidas[i];
      if (ehPrincipal(m)) return [];
      if (m.area < AREA_MINIMA) {
        const pct = (m.area * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        return [`${c.nome} (${c.hex}) cobre só ${pct}% da roupa: tire da paleta`];
      }
      return [`${c.nome} (${c.hex}) só aparece em traços e contornos: tire da paleta`];
    });
    if (problemas.length) aviso = [aviso, ...problemas].filter(Boolean).join('; ');
  }

  const mascaras = [];
  for (const cor of paleta ?? []) {
    const nome = `mascara-${chaveDaCor(cor.hex)}.png`;
    await gerarMascara(croqui, cor.hex, join(pasta, nome));
    mascaras.push(nome);
  }
  const removidas = readdirSync(pasta).filter((f) => /^mascara-.*\.png$/.test(f) && !mascaras.includes(f));
  for (const f of removidas) unlinkSync(join(pasta, f));

  return { paleta: paleta ?? [], criada, mascaras, removidas, aviso };
}

async function main() {
  const raiz = fileURLToPath(new URL('../src/content/croquis/', import.meta.url));
  if (!existsSync(raiz)) {
    console.log('Nenhum croqui em src/content/croquis.');
    return;
  }
  const pastas = readdirSync(raiz, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  let problemas = 0;
  for (const nome of pastas) {
    const pasta = join(raiz, nome);
    if (!existsSync(join(pasta, 'index.md'))) {
      console.log(`  ! ${nome}: sem index.md, ignorado`);
      continue;
    }
    const r = await processarLook(pasta);
    const cores = r.paleta.map((c) => `${c.hex} ${c.nome}`).join(', ') || '(sem paleta)';
    const extra = r.removidas.length ? ` · máscaras removidas: ${r.removidas.join(', ')}` : '';
    console.log(`  ${r.criada ? '+' : '='} ${nome}: ${cores}${extra}`);
    if (r.aviso) {
      problemas++;
      console.log(`    ! ${r.aviso}`);
    }
  }
  if (problemas) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
