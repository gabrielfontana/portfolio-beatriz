export interface PecaLike {
  id: string;
  data: { titulo: string; ano: number; destaque: boolean; colecao: { id: string } };
}

export function ordenarColecoes<T extends { data: { ordem: number } }>(colecoes: T[]): T[] {
  return [...colecoes].sort((a, b) => a.data.ordem - b.data.ordem);
}

export function porRecencia(a: PecaLike, b: PecaLike): number {
  return b.data.ano - a.data.ano || a.data.titulo.localeCompare(b.data.titulo, 'pt-BR');
}

export function pecasDaColecao<T extends PecaLike>(pecas: T[], colecaoId: string): T[] {
  return pecas.filter((p) => p.data.colecao.id === colecaoId).sort(porRecencia);
}

/** Peça que estampa uma capa: a marcada como destaque ou, na falta dela, a mais recente. */
export function pecaDeCapa<T extends PecaLike>(pecas: T[]): T | undefined {
  return pecas.find((p) => p.data.destaque) ?? [...pecas].sort(porRecencia)[0];
}
