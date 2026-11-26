// Gera imagens e PDF provisórios para o site rodar antes das fotos reais.
// Regra de ouro: NUNCA sobrescreve um arquivo existente.
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const escaparXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @returns {Promise<boolean>} true se criou; false se o arquivo já existia. */
export async function gerarImagem(caminho, { largura, altura, cor, rotulo }) {
  if (existsSync(caminho)) return false;
  mkdirSync(dirname(caminho), { recursive: true });
  const tamanho = Math.max(10, Math.round(largura / 14));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect width="100%" height="100%" fill="${cor}"/>
  <text x="50%" y="50%" font-family="Georgia, serif" font-size="${tamanho}" fill="#141414"
    text-anchor="middle" dominant-baseline="middle">${escaparXml(rotulo)}</text>
</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(caminho);
  return true;
}

/** PDF de uma página com linhas de texto (Helvetica, WinAnsi para acentos). */
export function montarPdf(linhas) {
  const esc = (s) => s.replace(/[\\()]/g, (m) => `\\${m}`);
  const conteudo = ['BT', '/F1 16 Tf', '72 740 Td', '24 TL', ...linhas.map((l) => `(${esc(l)}) '`), 'ET'].join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

async function main() {
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  let criados = 0;
  const criar = async (relativo, opcoes) => {
    if (await gerarImagem(join(raiz, relativo), opcoes)) {
      criados++;
      console.log(`  + ${relativo}`);
    }
  };

  await criar('src/content/sobre/retrato.jpg', { largura: 1000, altura: 1250, cor: '#ffd400', rotulo: 'retrato da Beatriz' });
  await criar('src/assets/og-padrao.jpg', { largura: 1200, altura: 630, cor: '#ff2e88', rotulo: 'BEATRIZ · modelista' });

  const cv = join(raiz, 'public/cv-beatriz.pdf');
  if (!existsSync(cv)) {
    mkdirSync(dirname(cv), { recursive: true });
    writeFileSync(cv, montarPdf(['Beatriz - Modelista', 'Currículo provisório.', 'Substitua public/cv-beatriz.pdf pelo CV real.']));
    criados++;
    console.log('  + public/cv-beatriz.pdf');
  }
  console.log(criados ? `${criados} arquivo(s) provisório(s) criado(s).` : 'Nada a fazer: todos os arquivos já existem.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
