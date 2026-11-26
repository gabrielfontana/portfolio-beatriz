# Portfólio da Beatriz

Site estático (portfólio + currículo) de uma modelista, com visual de caderno de ateliê (papel, grafite, fonte Fraunces e o vermelho dos croquis como acento; nada de cara de revista). Só em português. É **uma página só** (`src/pages/index.astro`), nesta ordem: **sobre** (`#sobre`: retrato, texto curto, habilidades e CV), **croquis** (`#croquis`, `src/components/croquis/SecaoCroquis.astro`) e **contato** (`#contato`, `src/components/Contato.astro`, que é o rodapé do layout). O menu só tem âncoras. As páginas de coleções, peças e processo foram removidas (estão no histórico do git). Quem edita o conteúdo é o Gabriel, direto nos arquivos (sem CMS). O guia de edição para humanos está em [docs/como-editar-conteudo.md](docs/como-editar-conteudo.md). Specs e planos estão em `docs/superpowers/`.

## Comandos
```bash
npm run dev            # http://localhost:4321
npm run build          # astro check + build (tipos e schemas de conteúdo quebram o build)
npm test               # Vitest (tests/unit)
npx playwright test    # e2e; o webServer faz build + preview em 127.0.0.1:4321
npm run croquis        # gera as imagens da seção de croquis a partir dos originais + paletas (rodar depois de mexer em src/content/{croquis,desenhos,estudos})
npm run paletas        # só paletas e máscaras dos croquis
npm run placeholders   # recria imagens provisórias que faltam (nunca sobrescreve)
```
Antes de dar algo por pronto, rode: `npx astro check`, `npm test` e `npx playwright test`. O Playwright roda dois projetos, `desktop` e `mobile` (Pixel 7), e os testes que valem para um só usam `test.skip(isMobile, ...)`.

## Stack e convenções
- **Versões:** Astro 5 (fixado em 5.18.x), GSAP 3 + ScrollTrigger, sharp. Fontes self-hosted via `@fontsource-variable` (Fraunces e Inter).
- **Idioma do código:** nomes de variáveis, funções, arquivos, testes e commits em **português**. Siga o estilo do arquivo ao redor.
- **Cores e tipografia:** ficam em `src/styles/tokens.css` (`--papel`, `--papel-escuro`, `--tinta`, `--grafite` para texto secundário, `--linha` para separadores finos, `--vermelho-texto` como acento). Títulos em Fraunces (eixo SOFT), texto em Inter. Botões e chips são contornados e arredondados; sem sombras duras nem CAIXA ALTA espaçada.
- **Conteúdo:** fica em `src/content/` (collections com schema Zod em `src/content.config.ts`), `src/data/site.json` e `public/`. Lógica pura e testável fica em `src/lib/`.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branches:** o trabalho está na `main`, com remoto `origin` no GitHub (`gabrielfontana/portfolio-beatriz`).

## Animações (`src/scripts/animacoes/`)
- **Módulos:** cada módulo exporta `iniciar(gsap) => limpeza` e usa `gsap.matchMedia` para os breakpoints. O `index.ts` carrega o GSAP só se a página tiver `[data-anim]`, roda em todo `astro:page-load` (ClientRouter) e limpa tudo em `astro:before-swap`.
- **Estado no `<html>`:** `data-animacoes` (`ativas` | `reduzidas` | `sem-alvos`), `data-animacoes-ciclo` e `data-gatilhos`. Nos testes, espere `data-animacoes="ativas"` antes de interagir.
- **Movimento reduzido:** com `prefers-reduced-motion`, nada é animado. Na seção de croquis, as interações continuam funcionando sem animar (troca instantânea, desenho já pronto). Toda animação nova precisa ter esse modo funcionando.

## Croquis (seção `#croquis` da página)
Spec: `docs/superpowers/specs/2026-10-04-croquis-provador-design.md` (escrita quando croquis era a página `/croquis`). A seção tem três partes: **Sketchbook** (provador), **À mão** (desenho ao vivo + mural) e **Estudos** (leitura guiada). Abas presas abaixo do menu levam a cada uma. Elas são `sticky` dentro do `<section data-pagina-croquis>`, então só aparecem enquanto os croquis estão na tela. Títulos: h1 é o nome da Beatriz, "Croquis" é h2 e as três partes são h3. Nenhum nome de pasta aparece no site.

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
- **Mural** (antigo varal; o componente ainda se chama `Varal.astro` e o seletor é `[data-varal]`):
  - Quadro de papel kraft com as folhas presas por alfinete ou fita crepe, um pouco tortas (giros fixos, sem sorteio). Tudo fica à mostra, em colunas CSS (`columns`), sem rolagem lateral. As folhas ficam paradas e já aparecem com a cor (sem efeito de grafite ao rolar); só se endireitam ao passar o mouse.
  - Os rascunhos (`tipo: rascunho`) vão por último, numa grade própria embaixo dos coloridos, e **sem** o filtro de grafite, que apagava os traços leves.
  - Sem etiqueta por desenho, porque os títulos são nomes de pasta.
  - **Colunas:** nada pode sair do topo de um item (alfinete e fita têm `top` positivo). Senão, o navegador desenha a sobra no pé da coluna anterior.
  - Folha deitada usa a proporção da imagem.
- **Visualizador** (`<dialog>` único):
  - **Abertura:** a folha voa da origem até o centro e a origem fica `visibility: hidden` até fechar. A página fica atrás, desfocada.
    - Só abre quando a imagem tocada já está decodificada (limite de 0,7 s). Trocar o `src` de uma `<img>` deixa a imagem anterior na tela até a nova chegar.
    - Ao fechar, o visualizador é esvaziado (sem `src`).
  - **Ritmo único:** abrir, fechar e folhear duram o mesmo (`VOO_MS = TROCA_MS`, 1 s) e usam as mesmas curvas macias, no mural e na mesa de luz (é o mesmo visualizador). Nos testes, espere o fim com `esperarVoo(page)`, não com tempo fixo.
  - **Navegação:** a próxima folha espia atrás da atual, há miniaturas, arraste e as setas do documento.
    - A troca é um baralho (~1 s), com tudo opaco. Avançando, a carta de cima (cópia `[data-folha-velha]`) é puxada para a esquerda por cima e, no meio, passa para baixo do monte (`z-index` nos keyframes). A carta que espiava parte da MESMA pose torta (lida do `transform` computado da "próxima") e endireita aos poucos. Voltando, é o inverso.
    - A "próxima" já mostra a folha seguinte por baixo da carta que vem para a frente: ela aparece espiando quando a carta sai da frente.
    - Cada troca também espera a imagem decodificar.
  - **Fechar em outra folha:** `abrirVisualizador(…, aoFechar)` avisa o índice final. O mural põe essa folha no topo da pilha (`porNoTopo` em `varal.ts`, `data-topo` no grupo) antes do voo de volta, e reabrir o grupo começa nela. Sem `aoFechar` (fichas do desenho ao vivo), a folha esmaece em vez de voar.
  - **Lupa:** fica acima da folha (`z-index`). No toque, liga ao segurar o dedo.
- **Estudos:**
  - Os pontos ficam em % da imagem. O quadro tem largura calculada pela proporção (com teto de altura), para o ponto ficar sobre a anotação.
  - **Nenhuma anotação aparece na tela:** nem texto, nem pontos. Os pontos (`x`, `y`) ficam escondidos e só dizem para onde o zoom vai a cada "Próximo". O `texto` de cada anotação continua no conteúdo, mas não é exibido (só um contador para leitores de tela).
- **Scripts:** `src/scripts/croquis/` (`index.ts` + módulos). Rodam em `astro:page-load`, limpam em `astro:before-swap` e marcam `data-croquis="pronto"` no `<html>` para os testes.

## Armadilhas conhecidas
- **Rolagem restaurada nos testes:** reabrir a mesma URL na mesma aba do Playwright restaura a rolagem anterior. Para testar vários tamanhos de tela, abra uma aba nova (`context.newPage()`).
- **Bash do Windows:**
  - Heredoc com `\\` vira `\`. Para arquivos com barras invertidas, use a ferramenta Write.
  - Use `MSYS_NO_PATHCONV=1` quando um argumento começar com `/`.
- **npm 11:** bloqueia install scripts. As ferramentas funcionam mesmo assim.
- **Lighthouse local:** precisa da URL do antivírus Kaspersky bloqueada, senão a injeção dele derruba a nota.
