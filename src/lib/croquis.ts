// Sem imports: também é importado direto pelo Node no scripts/gerar-paletas.mjs.
export interface CorDaPaleta {
  hex: string;
  nome: string;
}

export function chaveDaCor(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

export function caminhoDaMascara(lookId: string, hex: string): string {
  return `/src/content/croquis/${lookId}/mascara-${chaveDaCor(hex)}.png`;
}

export function resolverMascaras<T>(
  lookId: string,
  paleta: CorDaPaleta[] | undefined,
  mapa: Record<string, T>,
): Array<CorDaPaleta & { chave: string; mascara: T }> {
  if (!paleta || paleta.length === 0) throw new Error(`O ${lookId} ainda não tem paleta: rode npm run paletas`);
  return paleta.map((cor) => {
    const mascara = mapa[caminhoDaMascara(lookId, cor.hex)];
    if (!mascara) throw new Error(`Falta a máscara de ${cor.hex} em ${lookId}: rode npm run paletas`);
    return { ...cor, chave: chaveDaCor(cor.hex), mascara };
  });
}

export function faixaDaColecao(looks: { paleta?: CorDaPaleta[] }[]): string[] {
  return looks.flatMap((l) => (l.paleta ?? []).map((c) => c.hex));
}
