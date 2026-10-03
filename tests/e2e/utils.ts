import type { Page } from '@playwright/test';

/** Junta erros de JS e de console; ignora falhas de rede das Google Fonts (ambiente offline). */
export function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.location().url.includes('fonts.g')) return;
    erros.push(m.text());
  });
  return erros;
}
