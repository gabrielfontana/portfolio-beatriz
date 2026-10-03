# Portfólio da Beatriz

Site estático (portfólio + currículo) de uma modelista, em estilo de revista de moda. Só em português. Quem edita o conteúdo é o Gabriel, direto nos arquivos (sem CMS). O guia de edição para humanos está em [docs/como-editar-conteudo.md](docs/como-editar-conteudo.md). Specs e planos estão em `docs/superpowers/`.

## Comandos
```bash
npm run dev            # http://localhost:4321
npm run build          # astro check + build (tipos e schemas de conteúdo quebram o build)
npm test               # Vitest (tests/unit)
npx playwright test    # e2e; o webServer faz build + preview em 127.0.0.1:4321
npm run paletas        # paletas e máscaras dos croquis (rodar depois de mexer em src/content/croquis)
npm run placeholders   # recria imagens provisórias que faltam (nunca sobrescreve)
```
Antes de dar algo por pronto, rode: `npx astro check`, `npm test` e `npx playwright test`. O Playwright roda dois projetos, `desktop` e `mobile` (Pixel 7), e os testes que valem para um só usam `test.skip(isMobile, ...)`.

## Stack e convenções
- **Versões:** Astro 5 (fixado em 5.18.x), GSAP 3 + ScrollTrigger, sharp. Fontes self-hosted via `@fontsource-variable`.
- **Idioma do código:** nomes de variáveis, funções, arquivos, testes e commits em **português**. Siga o estilo do arquivo ao redor.
- **Cores e tipografia:** ficam em `src/styles/tokens.css`. Para texto vermelho, use `--vermelho-texto` (o `--vermelho` puro não passa no contraste AA).
- **Conteúdo:** fica em `src/content/` (collections com schema Zod em `src/content.config.ts`), `src/data/site.json` e `public/`. Lógica pura e testável fica em `src/lib/`.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branches:** o trabalho está na branch `feat/portfolio-v1`, ainda sem merge na `main`, e o repositório não tem remoto.

## Animações (`src/scripts/animacoes/`)
- **Módulos:** cada módulo exporta `iniciar(gsap) => limpeza` e usa `gsap.matchMedia` para os breakpoints. O `index.ts` carrega o GSAP só se a página tiver `[data-anim]`, roda em todo `astro:page-load` (ClientRouter) e limpa tudo em `astro:before-swap`.
- **Estado no `<html>`:** `data-animacoes` (`ativas` | `reduzidas` | `sem-alvos`), `data-animacoes-ciclo` e `data-gatilhos`. Nos testes, espere `data-animacoes="ativas"` antes de interagir.
- **Movimento reduzido:** com `prefers-reduced-motion`, nada é animado e o line-up de croquis vira uma grade parada. Toda animação nova precisa ter esse modo funcionando.

## Croquis (página `/croquis`)
- **Arquivos:** cada look fica em `src/content/croquis/look-NN/` com `croqui.jpeg`, `index.md` (`titulo`, `ordem`, `alt`, `paleta`) e `mascara-<hex>.png`, uma por cor. A capa mostra os 5 primeiros looks por `ordem`.
- **Paleta:** de 1 a 4 cores **principais**. A regra está em `src/lib/paleta.ts`, em `medirCores` e `ehPrincipal`, e só vale cor que:
  - cobre ≥5% da roupa (sem fundo, pele e o alto da figura, onde ficam cabeça e cabelo);
  - mantém ≥0,5% da roupa depois de uma erosão de raio 3px na largura de 600px, o que elimina traços, contornos e costuras.
  - O teste `tests/unit/croquis-conteudo.test.ts` mede as paletas publicadas e falha se alguma cor quebrar essa regra.
- **Script `gerar-paletas.mjs`:** **nunca altera uma paleta já escrita** no `index.md`. Ele só sugere quando a paleta falta e, para cores ruins escritas à mão, apenas avisa. As máscaras são sempre regeneradas e as órfãs, apagadas.
- **Imports diretos de `.ts`:** o script importa `src/lib/paleta.ts` e `src/lib/croquis.ts` direto pelo Node 24 (type stripping). Por isso esses dois arquivos **não podem ter imports** e só aceitam sintaxe TS apagável (nada de `enum`, `namespace` ou parameter properties).
- **Hex no YAML:** sempre **entre aspas**. Sem aspas, o `#` vira comentário.
- **Efeito de destaque:** o desenho vira cinza e a cor escolhida aparece por cima via `mask-image`. O palco tem `aspect-ratio` igual ao da imagem, para a máscara alinhar.
- **Fundo branco dos JPEGs:** some com `mix-blend-mode: multiply`. Mas o `<main>` (view transition) e o `transform` do desfile isolam a mistura, então `.lineup`, `.lineup__trilho` e `.prancha` precisam de `background: var(--papel)` próprio. Sem isso, aparecem retângulos brancos.
- **Line-up** (`lineup.ts` + `destaque-cor.ts`):
  - **Modos:** em ≥768px é o desfile, com a seção presa e a rolagem movendo a fila na horizontal. Em <768px é um carrossel com scroll-snap.
  - **Look em foco:** recebe `data-em-foco`. Os outros recebem `data-travado`, e as cores deles ficam com `aria-disabled="true"` (não destacam nem selecionam).
  - **Seleção:** só uma cor fica selecionada na página, e ela se solta quando o look sai de foco.
  - **Navegação:** tocar num look travado ou numa bolinha (`[data-ponto]`, com `aria-current`) leva a fila até ele com um tween suave.
  - **Margens laterais:** são calculadas em JS para o primeiro e o último look chegarem ao centro.
  - **Teclado:** o `focusin` zera o `scrollLeft` da seção, porque o navegador tenta rolar o `overflow: hidden` e isso desalinharia o desfile.
  - **Altura do croqui no desfile:** a fórmula em `CroquiCard.astro` reserva espaço para menu, bolinhas, rótulo, paleta e o `scale(1.08)` do look em foco. Se mudar algo vertical, rode os testes de "tela baixa".

## Armadilhas conhecidas
- **Rolagem restaurada nos testes:** reabrir a mesma URL na mesma aba do Playwright restaura a rolagem anterior. Para testar vários tamanhos de tela, abra uma aba nova (`context.newPage()`).
- **Toque no celular durante rolagem:** no carrossel, um toque enquanto a fila ainda desliza só para a rolagem, sem gerar clique. Nos testes, espere a fila parar (`filaParada`) antes de tocar.
- **Bash do Windows:**
  - Heredoc com `\\` vira `\`. Para arquivos com barras invertidas, use a ferramenta Write.
  - Use `MSYS_NO_PATHCONV=1` quando um argumento começar com `/`.
- **npm 11:** bloqueia install scripts. As ferramentas funcionam mesmo assim.
- **Lighthouse local:** precisa da URL do antivírus Kaspersky bloqueada, senão a injeção dele derruba a nota.
