// Sem imports: também é importado direto pelo Node no scripts/gerar-croquis.mjs.
// Marca d'água gravada nas imagens publicadas (os originais nunca levam marca):
// grade quadrada de linhas finas inclinada, com o nome no centro de cada quadrado.

export const MARCA = {
  angulo: -24, // graus
  quadradosNaLargura: 3.4,
  opacidadeLinha: 0.08,
  opacidadeNome: 0.11,
  cor: '#1a1a1a',
};

function escaparXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** SVG do tamanho exato da imagem, para compor por cima dela. */
export function svgMarca(largura: number, altura: number, nome: string): string {
  const lado = largura / MARCA.quadradosNaLargura;
  const fonte = (lado * 0.105).toFixed(1);
  const traco = Math.max(1, largura * 0.0012).toFixed(2);
  const cx = largura / 2;
  const cy = altura / 2;
  // raio que cobre a imagem inteira depois de girar
  const raio = Math.hypot(largura, altura) / 2 + lado;
  const n = Math.ceil(raio / lado);
  const linhas: string[] = [];
  const nomes: string[] = [];
  const f = (v: number) => v.toFixed(1);
  for (let k = -n; k <= n; k++) {
    const d = k * lado;
    linhas.push(
      `<line x1="${f(cx - raio)}" y1="${f(cy + d)}" x2="${f(cx + raio)}" y2="${f(cy + d)}"/>`,
      `<line x1="${f(cx + d)}" y1="${f(cy - raio)}" x2="${f(cx + d)}" y2="${f(cy + raio)}"/>`,
    );
  }
  const texto = escaparXml(nome);
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      nomes.push(`<text x="${f(cx + (i + 0.5) * lado)}" y="${f(cy + (j + 0.5) * lado)}">${texto}</text>`);
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">` +
    `<g transform="rotate(${MARCA.angulo} ${cx} ${cy})">` +
    `<g stroke="${MARCA.cor}" stroke-opacity="${MARCA.opacidadeLinha}" stroke-width="${traco}">${linhas.join('')}</g>` +
    `<g font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${fonte}" fill="${MARCA.cor}" ` +
    `fill-opacity="${MARCA.opacidadeNome}" text-anchor="middle" dominant-baseline="central">${nomes.join('')}</g>` +
    `</g></svg>`
  );
}
