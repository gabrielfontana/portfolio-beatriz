export interface ItemTrajetoria {
  inicio: number;
  fim: number | null;
  tipo: 'formacao' | 'experiencia';
  titulo: string;
  local: string;
  descricao?: string;
}

/** Mais recente primeiro: o que está em andamento (fim null) vem antes de tudo. */
export function ordenarTrajetoria<T extends ItemTrajetoria>(itens: T[]): T[] {
  const fim = (i: ItemTrajetoria) => i.fim ?? Number.POSITIVE_INFINITY;
  return [...itens].sort((a, b) => {
    if (fim(a) !== fim(b)) return fim(b) - fim(a);
    return b.inicio - a.inicio;
  });
}

export function formatarPeriodo(inicio: number, fim: number | null): string {
  if (fim === null) return `${inicio} — atual`;
  if (fim === inicio) return String(inicio);
  return `${inicio} — ${fim}`;
}
