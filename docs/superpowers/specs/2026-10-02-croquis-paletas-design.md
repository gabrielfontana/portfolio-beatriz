# Croquis com paletas interativas: spec de design

## Contexto
A Beatriz tem 9 croquis digitais reais (fundo branco, figura com tom de pele), hoje soltos em `src/assets/` com nomes do WhatsApp (`WhatsApp Image 2026-10-02 at 21.46.1x (n).jpeg`). Os 9 compartilham o **coração** como motivo (estampa, bolsa, decote, fivela, sapato) e formam uma coleção coesa. As cores das roupas são vermelho, preto, azul (cobalto, jeans, céu) e amarelo.

O Gabriel quer colocá-los no site de forma dinâmica e interativa, inspirado num portfólio de moda do Behance. A página do Behance bloqueia acesso automático (HTTP 403). Dela, ele quer trazer a **prancha de coleção** (looks em line-up) e a **paleta ao lado do croqui**.

### Decisões tomadas com o usuário
- Lugar: **nova página `/croquis`** no menu, com um bloco de destaque na capa.
- Paletas: **automáticas + ajuste manual**. Um script sugere 3–4 cores e grava no conteúdo, e um ajuste manual nunca é sobrescrito.
- Interações: **cor ilumina o desenho** (amostra destaca as áreas daquela cor) e **line-up que desfila**.
- Nomes: **neutros**, de "Look 01" a "Look 09". A Beatriz batiza depois.
- Técnica do destaque: **máscaras geradas pelo script**, com o efeito feito em CSS.

### Sondagem feita (descartável, fora do repo)
k-means sobre os 9 croquis:
- Tirando só o fundo, a **pele é a cor dominante** (23–37%).
- Tirando fundo e pele, as cores das roupas aparecem (ex.: `#0f74ba` 57% no macacão azul; `#2b2626` + `#bf343a` no vestido de corações).
- Ainda sobram ruídos: cinza claro da sombra do papel (`#c9d1d5`, `#d4cfcd`) e marrom de cabelo.
- Conclusão: a extração precisa de filtros de fundo, sombra e pele, de fusão de cores parecidas e de corte por área mínima. A curadoria manual continua disponível.

## Conteúdo
```
src/content/croquis/
  look-01/ … look-09/
    index.md            → titulo, ordem, alt, paleta
    croqui.jpeg         → o desenho (movido de src/assets; o arquivo do WhatsApp deixa de existir lá)
    mascara-<hex>.png   → uma máscara por cor da paleta (gerada pelo script)
```
- A ordem dos looks segue a ordem alfabética dos nomes de arquivo originais: `21.46.12`, `21.46.12 (1)`, `21.46.12 (2)`, `21.46.13`, `21.46.13 (1)` … `21.46.13 (4)`, `21.46.14`.
- Schema (`src/content.config.ts`, collection `croquis`, glob `*/index.md`):
  - `titulo: string`, `ordem: int`, `imagem: image()`, `alt: string (min 1)`
  - `paleta: array({ hex: /^#[0-9a-f]{6}$/i, nome: string }).min(3).max(4)`, **opcional no schema**. O script preenche, e a página exige a paleta e falha com mensagem clara se faltar.
- O `alt` de cada look descreve o desenho em português (ex.: "Croqui de vestido curto preto com recortes de coração vermelhos e mangas bufantes").

## Script `npm run paletas` (`scripts/gerar-paletas.mjs`)
Para cada `src/content/croquis/look-*/`:
1. Se o `index.md` **não tem** `paleta`, analisa `croqui.jpeg` e grava a paleta sugerida no frontmatter. Se já tem, **não altera nada** no `index.md`.
2. Gera `mascara-<hex sem #>.png` para cada cor da paleta atual. Apaga `mascara-*.png` de cores que não estão mais na paleta.
3. Imprime um resumo (`look-03: #bf343a Vermelho, #2b2626 Preto, …`).

### Algoritmo (lógica pura em `src/lib/paleta.ts`, com testes unitários)
- Reduz a imagem para ~160px de largura e lê os pixels RGB.
- **Fundo/sombra:** descarta pixels claros e pouco saturados (L* > 80 e croma < 12 no espaço Lab).
- **Pele:** descarta pixels no intervalo de matiz e saturação de tons de pele (laranja dessaturado, médio-claro). Não descarta vermelho saturado, amarelo saturado, preto nem marrom muito escuro.
- **Agrupamento:** k-means (k=6) em Lab com inicialização determinística, para dar o mesmo resultado a cada execução.
- **Pós-processo:**
  - Funde grupos com ΔE < 12.
  - Descarta grupos com menos de 3% dos pixels restantes.
  - Ordena por área.
  - Fica com até 4 cores. Se sobrarem menos de 3, completa com os próximos grupos acima de 1%; se ainda faltar, o script avisa e deixa a paleta para edição manual.
- **Nome da cor:** a partir de luminosidade, croma e matiz: Preto, Branco, Cinza, Vermelho, Vinho, Rosa, Laranja, Amarelo, Verde, Azul-claro, Azul, Azul-marinho, Roxo, Marrom.
- **Máscara de uma cor:** pixels da imagem em tamanho cheio com ΔE < 18 até aquela cor, desde que não sejam fundo nem pele, com leve desfoque (≈1px) para suavizar a borda. Branco = área visível, transparente = resto (PNG com alpha), no tamanho original do croqui.

## Página `/croquis`
- **Topo:**
  - Kicker "Prancha de coleção", `h1` "Croquis" e uma linha de texto.
  - **Faixa de cor da coleção:** as paletas dos 9 looks em sequência numa tira contínua, com todas as cores na mesma largura.
- **Line-up** (`src/components/LineUpCroquis.astro` + `CroquiCard.astro` + `AmostraCor.astro`):
  - **Desktop ≥768px com animação:** a seção fica presa (pin) e a rolagem vertical move a fila na horizontal (GSAP ScrollTrigger com scrub).
    - O look mais próximo do centro recebe `data-em-foco`: escala ~1.12, rótulo "LOOK 0N" e paleta aberta ao lado.
    - Os demais ficam com opacidade 0.55.
  - **Celular (<768px):** carrossel horizontal com `scroll-snap`, sem pin. O look encaixado no centro (IntersectionObserver) fica em foco, com a paleta embaixo.
  - **Sem JS ou com `prefers-reduced-motion`:** grade com todos os looks e todas as paletas visíveis. Nenhum conteúdo depende de JS para aparecer.
- **Amostra de cor** (`button`):
  - Mostra o círculo da cor, o nome e o hex.
  - `aria-label="Destacar <nome> <hex> no <titulo>"` e `aria-pressed`.
  - Hover ou foco ativa o destaque. Toque ou clique liga e desliga, e só um destaque fica ativo por croqui.
- **Efeito de destaque:**
  - O croqui base recebe `filter: grayscale(1)` e `opacity: .35`.
  - Por cima vai uma camada com a mesma imagem colorida e `mask-image: url(mascara-<hex>.png)` (com `-webkit-mask-image`), com transição de opacidade.
  - Com movimento reduzido, troca sem transição.
- **Máscaras no build:** a página resolve `mascara-<hex>.png` via `import.meta.glob`. Se faltar alguma, o build falha com: `Falta a máscara de #xxxxxx em look-NN: rode npm run paletas`.
- **Integração:**
  - O menu ganha **Croquis** (`/croquis`).
  - A capa ganha o bloco **"Prancha de croquis"** após "Nesta edição", com os 5 primeiros looks em fila e link para a página.
  - A prévia de link de `/croquis` usa o croqui do Look 01.
- **Animação:**
  - Novo módulo `src/scripts/animacoes/lineup.ts`, no padrão existente: `iniciar(gsap)` devolve a função de limpeza e usa `gsap.matchMedia`. É ativado por `[data-anim="lineup"]`.
  - O carrossel do celular usa um script leve próprio, com IntersectionObserver e listeners delegados, que funciona com o ClientRouter.

## Qualidade e testes
- **Unitários (`tests/unit/paleta.test.ts`):**
  - RGB↔Lab com valores de referência.
  - ΔE.
  - k-means separa grupos óbvios e é determinístico.
  - O filtro de fundo descarta branco e cinza claro, e preserva preto e cores saturadas.
  - O filtro de pele descarta tons de pele (`#cb9c86`, `#d9aa8e`, `#ba856a`) e preserva `#bf343a`, `#f1bc55`, `#2b2626`, `#0f74ba`.
  - `sugerirPaleta` devolve 3–4 cores e funde quase iguais.
  - `nomearCor` acerta os casos principais.
- **Script (`tests/unit/gerar-paletas.test.ts`):** usa um croqui sintético gerado com sharp (fundo branco, retângulo de pele e dois blocos de cor) num diretório temporário.
  - Grava a paleta quando ausente.
  - Não altera uma paleta existente.
  - Cria as máscaras da paleta e apaga máscaras órfãs.
- **E2E (`tests/e2e/croquis.spec.ts`, desktop e mobile):**
  - 9 looks na ordem, cada um com 3–4 amostras.
  - Ativar uma amostra marca `aria-pressed="true"` e torna visível a camada de destaque com `mask-image` da máscara certa. Ativar de novo desliga.
  - No desktop, rolar muda o look em foco. No celular, deslizar o carrossel muda.
  - Com movimento reduzido aparece a grade com todas as paletas visíveis.
  - O menu e a capa levam a `/croquis`.
  - Navegar e voltar não acumula gatilhos.
- **Varredura existente:** `/croquis` entra em `ROTAS` de `qualidade.spec.ts` (sem rolagem horizontal, inclusive o menu com 5 itens; axe AA; console limpo; links) e em `compartilhamento.spec.ts`.
- **Conferência real:** rodar `npm run paletas` nos 9 croquis, revisar as paletas e screenshots do efeito, e ajustar os limiares se algum look sair com ruído.

## Fora do escopo
Filtrar por cor, copiar hex, desenho técnico, moodboard, nomes definitivos dos looks e página individual por look.
