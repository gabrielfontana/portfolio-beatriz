/** Folha de desenho como o visualizador recebe (JSON em data-folhas). */
export interface FolhaVisor {
  src: string;
  mini: string;
  largura: number;
  altura: number;
  alt: string;
  colorido: boolean;
}

export const reduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function lerFolhas(el: HTMLElement): FolhaVisor[] {
  return JSON.parse(el.dataset.folhas ?? '[]') as FolhaVisor[];
}

export type Limpeza = () => void;

/** Liga um listener e devolve a função que o desliga. */
export function ouvir<K extends keyof HTMLElementEventMap>(
  alvo: HTMLElement | Window | Document,
  tipo: K | string,
  fn: (evento: HTMLElementEventMap[K]) => void,
  opcoes?: AddEventListenerOptions,
): Limpeza {
  alvo.addEventListener(tipo, fn as EventListener, opcoes);
  return () => alvo.removeEventListener(tipo, fn as EventListener, opcoes);
}

export const limitar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
