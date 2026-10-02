const TINTA = '#141414';
const BRANCO = '#ffffff';

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => canal(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Escolhe a cor de texto (tinta ou branco) com mais contraste sobre o fundo informado. */
export function corDeTextoSobre(hex: string): typeof TINTA | typeof BRANCO {
  return contraste(hex, TINTA) >= contraste(hex, BRANCO) ? TINTA : BRANCO;
}
