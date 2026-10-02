export const ROTULOS_ETAPAS = {
  croqui: 'Croqui',
  molde: 'Molde',
  costura: 'Corte e costura',
  final: 'Peça pronta',
} as const;

export type ChaveEtapa = keyof typeof ROTULOS_ETAPAS;

export const ORDEM_ETAPAS: ChaveEtapa[] = ['croqui', 'molde', 'costura', 'final'];

export function etapasEmOrdem<T extends object>(processo: Record<ChaveEtapa, T>) {
  return ORDEM_ETAPAS.map((chave, i) => ({
    ...processo[chave],
    chave,
    numero: String(i + 1).padStart(2, '0'),
    rotulo: ROTULOS_ETAPAS[chave] as string,
  }));
}
