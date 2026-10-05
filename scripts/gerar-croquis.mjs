// Gera as imagens publicadas da página de croquis a partir dos originais de cada pasta de conteúdo.
// Regra de ouro: NUNCA altera os originais (original*.*) nem os index.md. Só (re)escreve os arquivos gerados:
//   croquis/look-NN/croqui.jpg         ← original.*   (alinhado pela cabeça num quadro comum + marca d'água)
//   desenhos/<grupo>/folha-N.jpg       ← original-N.* (girado se `girar` + marca d'água)
//   desenhos/<grupo>/lapis.png, tempo.png  (só com aoVivo: camada de lápis e mapa de tempo do desenho ao vivo)
//   estudos/estudo-N/prancha.jpg       ← original.*   (marca d'água)
// Depois rode `npm run paletas` (o `npm run croquis` já faz os dois).
import sharp from 'sharp';
import { parse } from 'yaml';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { svgMarca } from '../src/lib/marca.ts';
import { centroDaCabeca, enquadrar, FAIXA_CABECA, QUADRO } from '../src/lib/alinhamento.ts';
import { camadaLapis, mapaDeTempo, TELA_AO_VIVO } from '../src/lib/ao-vivo.ts';

// No Windows o cache do sharp mantém arquivos abertos e impede regravar.
sharp.cache(false);

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const JPEG = { quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true };
/** Altura máxima das folhas e pranchas publicadas (o Astro ainda gera tamanhos menores para a tela). */
const ALTURA_MAXIMA = 2200;

const raizConteudo = fileURLToPath(new URL('../src/content/', import.meta.url));
const site = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/site.json', import.meta.url)), 'utf8'));

export function lerFrontmatter(md) {
  const m = md.match(FRONTMATTER);
  if (!m) throw new Error('index.md sem frontmatter (bloco entre ---)');
  return parse(m[1]) ?? {};
}

/** Acha `<prefixo>.<ext>` (jpg, jpeg, png ou webp; maiúsculas ou minúsculas) na pasta. */
export function acharOriginal(pasta, prefixo) {
  const nome = readdirSync(pasta).find((f) => new RegExp(`^${prefixo}\\.(jpe?g|png|webp)$`, 'i').test(f));
  if (!nome) throw new Error(`${pasta}: falta o arquivo ${prefixo}.jpg (ou .png/.webp)`);
  return join(pasta, nome);
}

/** Pixels crus com o número de canais pedido (o sharp às vezes devolve 3 canais para entrada de 1). */
async function cru(pipeline, canais) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.channels === canais) return { data, info };
  const n = info.width * info.height;
  const saida = Buffer.alloc(n * canais);
  for (let i = 0; i < n; i++) for (let c = 0; c < canais; c++) saida[i * canais + c] = data[i * info.channels + c];
  return { data: saida, info: { ...info, channels: canais } };
}

/** Grava a marca d'água por cima (imagem já no tamanho final). */
export async function comMarca(entrada) {
  const img = sharp(entrada);
  const { width, height } = await img.metadata();
  return img.composite([{ input: Buffer.from(svgMarca(width, height, site.nomeCompleto)) }]);
}

/** Croqui do Sketchbook: recorta o branco, escala a figura e centraliza pela cabeça num quadro comum. */
export async function alinharCroqui(original) {
  const branco = await sharp(original).flatten({ background: '#ffffff' }).toBuffer();
  const figura = await sharp(branco).trim({ background: '#ffffff', threshold: 40 }).resize({ height: QUADRO.alturaFigura }).toBuffer();
  const { data: cinza, info } = await cru(sharp(figura).greyscale(), 1);
  const linhas = Math.round(QUADRO.alturaFigura * FAIXA_CABECA);
  const e = enquadrar(info.width, centroDaCabeca(cinza, info.width, linhas));
  const pedaco = await sharp(figura).extract({ left: e.recorteX, top: 0, width: e.larguraVisivel, height: QUADRO.alturaFigura }).toBuffer();
  return sharp({ create: { width: QUADRO.largura, height: QUADRO.altura, channels: 3, background: '#ffffff' } })
    .composite([{ input: pedaco, left: e.esquerda, top: QUADRO.margem }])
    .png()
    .toBuffer();
}

/** Folha à mão no tamanho de publicação, girada se pedido (sem marca). */
async function folhaLimpa(original, girar) {
  return sharp(original).rotate(girar || 0).resize({ height: ALTURA_MAXIMA, withoutEnlargement: true }).toBuffer();
}

/** Camadas do desenho ao vivo a partir da folha limpa: lápis (com marca) e mapa de tempo. */
export async function camadasAoVivo(folha) {
  const { largura, altura } = TELA_AO_VIVO;
  const { data: rgb } = await cru(sharp(folha).resize(largura, altura, { fit: 'fill' }).removeAlpha(), 3);
  const cinza = new Uint8Array(largura * altura);
  for (let i = 0; i < cinza.length; i++) cinza[i] = Math.round(0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]);
  const invertido = Buffer.from(cinza.map((v) => 255 - v));
  const { data: borrado } = await cru(sharp(invertido, { raw: { width: largura, height: altura, channels: 1 } }).blur(5), 1);
  const lapisCinza = camadaLapis(cinza, borrado);
  const lapisPng = await sharp(Buffer.from(lapisCinza), { raw: { width: largura, height: altura, channels: 1 } }).png().toBuffer();
  const lapis = await (await comMarca(lapisPng)).png().toBuffer();
  const tempo = await sharp(Buffer.from(mapaDeTempo(rgb, largura, altura)), { raw: { width: largura, height: altura, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { lapis, tempo };
}

async function gravarJpeg(entrada, destino) {
  writeFileSync(destino, await (await comMarca(entrada)).jpeg(JPEG).toBuffer());
}

function pastasDe(colecao) {
  const raiz = join(raizConteudo, colecao);
  if (!existsSync(raiz)) return [];
  return readdirSync(raiz, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(raiz, d.name, 'index.md')))
    .map((d) => join(raiz, d.name))
    .sort();
}

export async function gerarCroqui(pasta) {
  await gravarJpeg(await alinharCroqui(acharOriginal(pasta, 'original')), join(pasta, 'croqui.jpg'));
}

export async function gerarDesenho(pasta) {
  const dados = lerFrontmatter(readFileSync(join(pasta, 'index.md'), 'utf8'));
  const folhas = dados.folhas ?? [];
  for (const [i, f] of folhas.entries()) {
    const limpa = await folhaLimpa(acharOriginal(pasta, `original-${i + 1}`), f.girar);
    await gravarJpeg(limpa, join(pasta, `folha-${i + 1}.jpg`));
    if (dados.aoVivo && i === 0) {
      const { lapis, tempo } = await camadasAoVivo(limpa);
      writeFileSync(join(pasta, 'lapis.png'), lapis);
      writeFileSync(join(pasta, 'tempo.png'), tempo);
    }
  }
  return folhas.length;
}

export async function gerarEstudo(pasta) {
  const limpa = await sharp(acharOriginal(pasta, 'original'))
    .flatten({ background: '#ffffff' })
    .resize({ width: ALTURA_MAXIMA, height: ALTURA_MAXIMA, fit: 'inside', withoutEnlargement: true })
    .toBuffer();
  await gravarJpeg(limpa, join(pasta, 'prancha.jpg'));
}

async function main() {
  const nome = (p) => p.split(/[\\/]/).pop();
  for (const p of pastasDe('croquis')) {
    await gerarCroqui(p);
    console.log(`  croqui  ${nome(p)}`);
  }
  for (const p of pastasDe('desenhos')) console.log(`  desenho ${nome(p)} (${await gerarDesenho(p)} folhas)`);
  for (const p of pastasDe('estudos')) {
    await gerarEstudo(p);
    console.log(`  estudo  ${nome(p)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
