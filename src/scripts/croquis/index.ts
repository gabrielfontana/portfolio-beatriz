// Interações da página de croquis. Roda em todo astro:page-load (ClientRouter) e limpa tudo em
// astro:before-swap. Com movimento reduzido, cada módulo continua funcionando, só sem animar.
// Quando termina de montar, marca data-croquis="pronto" no <html> (os testes esperam por ele).
import type { Limpeza } from './comum';
import { iniciar as abas } from './abas';
import { iniciar as provador } from './provador';
import { iniciar as visualizador } from './visualizador';
import { iniciar as aoVivo } from './ao-vivo';
import { iniciar as varal } from './varal';
import { iniciar as estudos } from './estudos';

let limpezas: Limpeza[] = [];

function limpar() {
  limpezas.forEach((f) => f());
  limpezas = [];
  delete document.documentElement.dataset.croquis;
}

function iniciar() {
  limpar();
  const raiz = document.querySelector<HTMLElement>('[data-pagina-croquis]');
  if (!raiz) return;
  limpezas = [abas(raiz), provador(raiz), visualizador(raiz), aoVivo(raiz), varal(raiz), estudos(raiz)];
  document.documentElement.dataset.croquis = 'pronto';
}

document.addEventListener('astro:page-load', iniciar);
document.addEventListener('astro:before-swap', limpar);
