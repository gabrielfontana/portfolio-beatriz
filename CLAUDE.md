# Portfólio da Beatriz

Site estático (portfólio + currículo) de uma modelista, em estilo de revista de moda. Só em português. Quem edita o conteúdo é o Gabriel, direto nos arquivos (sem CMS). O guia de edição para humanos está em [docs/como-editar-conteudo.md](docs/como-editar-conteudo.md). Specs e planos estão em `docs/superpowers/`.

## Comandos
```bash
npm run dev            # http://localhost:4321
npm run build          # astro check + build (tipos e schemas de conteúdo quebram o build)
npm test               # Vitest (tests/unit)
npx playwright test    # e2e; o webServer faz build + preview em 127.0.0.1:4321
npm run croquis        # gera as imagens da página de croquis a partir dos originais + paletas (rodar depois de mexer em src/content/{croquis,desenhos,estudos})
npm run paletas        # só paletas e máscaras dos croquis
npm run placeholders   # recria imagens provisórias que faltam (nunca sobrescreve)
```
Antes de dar algo por pronto, rode: `npx astro check`, `npm test` e `npx playwright test`. O Playwright roda dois projetos, `desktop` e `mobile` (Pixel 7), e os testes que valem para um só usam `test.skip(isMobile, ...)`.

## Stack e convenções
- **Versões:** Astro 5 (fixado em 5.18.x), GSAP 3 + ScrollTrigger, sharp. Fontes self-hosted via `@fontsource-variable`.
- **Idioma do código:** nomes de variáveis, funções, arquivos, testes e commits em **português**. Siga o estilo do arquivo ao redor.
- **Cores e tipografia:** ficam em `src/styles/tokens.css`. Para texto vermelho, use `--vermelho-texto` (o `--vermelho` puro não passa no contraste AA).
- **Conteúdo:** fica em `src/content/` (collections com schema Zod em `src/content.config.ts`), `src/data/site.json` e `public/`. Lógica pura e testável fica em `src/lib/`.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branches:** o trabalho está na `main`, com remoto `origin` no GitHub (`gabrielfontana/portfolio-beatriz`).

## Animações (`src/scripts/animacoes/`)
- **Módulos:** cada módulo exporta `iniciar(gsap) => limpeza` e usa `gsap.matchMedia` para os breakpoints. O `index.ts` carrega o GSAP só se a página tiver `[data-anim]`, roda em todo `astro:page-load` (ClientRouter) e limpa tudo em `astro:before-swap`.
- **Estado no `<html>`:** `data-animacoes` (`ativas` | `reduzidas` | `sem-alvos`), `data-animacoes-ciclo` e `data-gatilhos`. Nos testes, espere `data-animacoes="ativas"` antes de interagir.
- **Movimento reduzido:** com `prefers-reduced-motion`, nada é animado. Na página de croquis, as interações continuam funcionando sem animar (troca instantânea, desenho já pronto). Toda animação nova precisa ter esse modo funcionando.

## Croquis (página `/croquis`)
Spec: `docs/superpowers/specs/2026-10-04-croquis-provador-design.md`. A página tem três seções: **Sketchbook** (provador), **À mão** (desenho ao vivo + varal) e **Estudos** (leitura guiada). Abas presas abaixo do menu levam a cada uma. Nenhum nome de pasta aparece no site.

- **Originais vs. gerados:**
  - O conteúdo de `src/content/{croquis,desenhos,estudos}/` guarda o `original*.*`, que **nunca é alterado**.
  - `npm run croquis` (`scripts/gerar-croquis.mjs`, que roda o de paletas no fim) **regera** `croqui.jpg`, `folha-N.jpg`, `lapis.png`, `tempo.png` e `prancha.jpg`. Nunca toca em originais nem em `index.md`.
  - Toda imagem gerada leva a **marca d'água** "Beatriz Chiusi" (`src/lib/marca.ts`, nome em `site.json` → `nomeCompleto`), gravada no arquivo para vir junto em "salvar como".
  - No Windows, o script precisa de `sharp.cache(false)`.
- **Libs importadas pelo Node:** `paleta.ts`, `croquis.ts`, `marca.ts`, `alinhamento.ts` e `ao-vivo.ts` (todas em `src/lib`) são importadas direto pelo Node 24 (type stripping). Por isso **não podem ter imports** e só aceitam sintaxe TS apagável (nada de `enum`, `namespace` ou parameter properties).
- **sharp com 1 canal:** em entrada raw de 1 canal, `.blur()`, `.greyscale()` e `.resize()` podem devolver 3 canais. Leia `info.channels` (veja `cru()` no script).
- **Provador:**
  - **Alinhamento:**
    - Cada look tem `pose` (`a`, `b` ou `c`), e looks da mesma pose formam um manequim.
    - O script recorta o branco, escala a figura para 1400 px de altura e centraliza pela cabeça (média das colunas escuras nos 7% de cima) num quadro de 1000×1500. Assim a roupa troca "no mesmo corpo".
  - **Empilhamento:**
    - Cada look é um `CroquiCard` (`[data-croqui]`), e o `destaque-cor.ts` funciona sem mudança.
    - Com o script, `.provador--ativo` empilha os looks: o `article` vira `display: contents`, os palcos ficam na mesma célula da grade e as paletas embaixo.
    - Os looks guardados ficam `inert`.
    - Sem JS, tudo aparece em grade.
  - **Troca de look:**
    - A roupa cai com borda esfumada: máscara 3× mais alta animando `mask-position`, mais o desfoque e o brilho.
    - Voltar faz o caminho ao contrário, de baixo para cima.
    - A cor selecionada se solta na troca.
    - Com movimento reduzido, a troca é instantânea.
  - **Palco:** tem fundo próprio (papel), e as imagens usam `mix-blend-mode: multiply` dentro dele. Assim o look de cima cobre o de baixo por inteiro.
  - **Tamanho:** só o palco é limitado pela altura da tela (`54vh`, ou `50svh` no celular), para a paleta e as setas caberem. No celular, os manequins ficam um embaixo do outro, porque o arraste lateral troca a roupa.
- **Paleta:** de 1 a 4 cores **principais**. A regra está em `src/lib/paleta.ts` (`medirCores`, `ehPrincipal`) e só vale cor que:
  - cobre ≥5% da roupa;
  - mantém ≥0,5% depois de uma erosão de 3 px a 600 px de largura.
  - O teste `tests/unit/croquis-conteudo.test.ts` mede as paletas publicadas. O script de paletas nunca altera uma paleta já escrita e apaga as máscaras órfãs.
  - **Hex no YAML:** sempre **entre aspas**.
- **Desenho ao vivo (`aoVivo: true`):**
  - **Camadas:** o script gera `lapis.png` (com marca) e `tempo.png`, um mapa em que R = lápis e G = marcador, em 700×990. O canvas mistura as camadas com `pintarQuadro`.
  - **Dois gatilhos, uma vez só:** as fichas entram com 12% visível; o desenho começa com 35% e leva ~2 s.
  - **No fim:** a imagem final (com marca) volta no lugar do canvas.
  - **Mesa de luz:** vai de ponta a ponta porque a seção `#a-mao` é larga (não usar `100vw`, que causa rolagem lateral). Ela tem `overflow: clip`, porque as fichas esperam fora da tela.
- **Varal:**
  - Os rascunhos (`tipo: rascunho`) vão por último e **sem** o filtro de grafite, que apagava os traços leves.
  - As folhas balançam com a velocidade da rolagem.
  - Folha deitada usa a proporção da imagem.
- **Visualizador** (`<dialog>` único):
  - **Abertura:** a folha voa da origem até o centro e a origem fica `visibility: hidden` até fechar. A página fica atrás, desfocada.
  - **Navegação:** a próxima folha espia atrás da atual, há miniaturas, arraste e as setas do documento.
  - **Lupa:** fica acima da folha (`z-index`). No toque, liga ao segurar o dedo.
- **Estudos:**
  - Os pontos ficam em % da imagem. O quadro tem largura calculada pela proporção (com teto de altura), para o ponto ficar sobre a anotação.
  - **Os textos das anotações são provisórios** (a Beatriz precisa conferir).
- **Scripts:** `src/scripts/croquis/` (`index.ts` + módulos). Rodam em `astro:page-load`, limpam em `astro:before-swap` e marcam `data-croquis="pronto"` no `<html>` para os testes.

## Armadilhas conhecidas
- **Rolagem restaurada nos testes:** reabrir a mesma URL na mesma aba do Playwright restaura a rolagem anterior. Para testar vários tamanhos de tela, abra uma aba nova (`context.newPage()`).
- **Bash do Windows:**
  - Heredoc com `\\` vira `\`. Para arquivos com barras invertidas, use a ferramenta Write.
  - Use `MSYS_NO_PATHCONV=1` quando um argumento começar com `/`.
- **npm 11:** bloqueia install scripts. As ferramentas funcionam mesmo assim.
- **Lighthouse local:** precisa da URL do antivírus Kaspersky bloqueada, senão a injeção dele derruba a nota.
