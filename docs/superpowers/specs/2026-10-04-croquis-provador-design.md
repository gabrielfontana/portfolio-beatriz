# Página de croquis: provador, desenhos à mão e estudos (spec de design)

## Contexto
A página `/croquis` mostrava 9 looks digitais num line-up que desfilava com a rolagem. Agora há mais material, em `img/`:

- **Sketchbook / coleções:** 21 croquis do app Sketchbook (os 9 publicados + 12 novos). O Gabriel renomeou os arquivos pela pose, e são **3 poses** que se repetem com roupas diferentes:
  - A: arquivos 1–7;
  - B: arquivos 8–13;
  - C: arquivos 14–21.
- **Sketchbook / estudos:** 7 estudos do app, com planificações, anotações de medidas e fotos de referência.
- **Desenhos à mão:** 28 folhas escaneadas em pastas por tema. Há looks completos com ficha técnica (frente e costas), séries temáticas, peças soltas, um sapato e 7 rascunhos a lápis. As manchas amarelas de papel antigo já foram limpas nos originais. O backup está em `img-originais-com-manchas/`.

As decisões abaixo vieram de uma demo interativa iterada com o Gabriel.

### Decisões
- **Divisão escrita e clara** entre **Sketchbook** (com o logo do app) e **À mão**. Os estudos do app ficam numa terceira seção, no fim da página, também com o logo.
- **Nenhum rótulo de pasta aparece** ("anos 70", "look completo" etc.). A divisão dentro de cada seção é só visual.
- **Sketchbook = provador por pose:**
  - um "manequim" por pose, e a roupa troca no mesmo corpo;
  - a troca é chamativa, mas suave: a roupa nova cai de cima para baixo com borda esfumada, uma faixa de brilho acompanha a borda e a nova assenta saindo de um leve desfoque; voltar é de baixo para cima;
  - controles: toque ou clique troca para o próximo, arrastar para o lado vai para o próximo ou o anterior, e há setas, bolinhas e teclado;
  - **rejeitados nas rodadas:** troca relâmpago automática, folhear com cursor ou dedo, camadas explodidas em 3D e desfile combinado.
- **Paleta:** o destaque de cor atual (máscaras) continua, valendo para o look vestido no momento. Só uma cor fica selecionada na página, e ela se solta quando o look troca.
- **À mão:**
  1. **Desenho ao vivo:** três looks completos com ficha técnica, numa mesa de luz.
     - Quando a folha aparece, o lápis desenha de cima para baixo e o marcador colore em pinceladas diagonais, em ~2 s. Depois o desenho fica pronto e não se desfaz.
     - As fichas técnicas entram pela direita assim que a seção começa a aparecer (~0,6 s), para quem rola rápido também ver.
     - Nada fica preso na tela.
  2. **Varal:**
     - **Folhas penduradas:** os outros desenhos ficam num fio e balançam com a velocidade da rolagem. As folhas de um mesmo grupo ficam presas por um clipe, e os rascunhos a lápis vão por último, sem o filtro de grafite.
     - **Traço → cor:** nas folhas coloridas, a cor desce sobre o grafite quando a folha aparece.
- **Visualizador** (ao tocar numa folha):
  - **Abertura:** a folha voa do lugar até o centro e a página fica atrás, clara e desfocada.
  - **Navegação:** a próxima folha espia atrás da atual, com uma seta. Há miniaturas grandes, arraste no celular, setas do teclado e Esc.
  - **Lupa:** segue o mouse; no celular, aparece ao segurar o dedo.
  - **Traço ↔ cor:** controle só nas folhas coloridas.
  - **Fechamento:** a folha volta ao lugar de onde saiu.
- **Estudos = leitura guiada:**
  - uma prancha por vez, com pontos numerados nas anotações;
  - tocar num ponto (ou em "Próxima anotação") faz zoom até ali e mostra o texto legível ao lado;
  - miniaturas trocam de estudo, e os estudos com mais anotação vêm primeiro.
  - **Os textos são provisórios** (transcritos dos desenhos) e a Beatriz precisa conferir.
- **Marca d'água "Beatriz Chiusi"** gravada nas imagens publicadas, e não só desenhada por cima. Assim ela vem junto em "abrir em nova guia" e "salvar como".
  - Desenho: grade quadrada de linhas finas inclinada a −24°, com o nome no centro de cada quadrado e cerca de 3,4 quadrados na largura. Linhas a 8% de opacidade, nome a 11%.
  - **Os originais nunca levam marca.**
- **Sapato:** é exibido deitado (girado 90° anti-horário). O original continua como está.

## Conteúdo
O original fica junto do conteúdo e **nunca é alterado**. As imagens publicadas são geradas a partir dele por script.

```
src/content/croquis/look-NN/          (21 looks do Sketchbook; NN = número do arquivo em img/)
  original.<ext>      → arquivo do app, como veio
  croqui.jpg          → GERADO: alinhado pela cabeça (todos no mesmo quadro 1000×1500) + marca d'água
  mascara-<hex>.png   → GERADO pelo npm run paletas
  index.md            → titulo, ordem, pose (a|b|c), imagem: ./croqui.jpg, alt, paleta

src/content/desenhos/<grupo>/         (desenhos à mão)
  original-N.<ext>    → folha escaneada N (1, 2, 3…)
  folha-N.jpg         → GERADO: girada se pedido + marca d'água
  lapis.png, tempo.png → GERADOS só quando aoVivo: true (camada de lápis e mapa de tempo, 700×990)
  index.md            → titulo (interno, não aparece), ordem, tipo (colorido|rascunho), aoVivo, folhas[{ imagem, alt, girar? }]

src/content/estudos/estudo-N/
  original.<ext>
  prancha.jpg         → GERADO: marca d'água
  index.md            → ordem, imagem, alt, anotacoes[{ x, y, texto }]   (x, y em % da imagem)
```

**Alinhamento** (pose-agnóstico):
1. Recorta o branco em volta da figura (`trim`) e escala a figura para 1400 px de altura.
2. Centraliza horizontalmente pela cabeça: a média das colunas escuras nos 7% de cima.
3. Cola num quadro de 1000×1500 px.

Figuras da mesma pose ficam sobrepostas (verificado na demo).

**Script `npm run croquis`** (`scripts/gerar-croquis.mjs`, que roda o de paletas no fim):
- regera todos os arquivos GERADOS a partir dos originais e é idempotente;
- **nunca** altera originais nem `index.md`.

A lógica pura fica em `src/lib/` sem imports, para o Node importar direto:
- `marca.ts`: o SVG da marca;
- `alinhamento.ts`: centro da cabeça e enquadramento;
- `ao-vivo.ts`: camada de lápis e mapa de tempo.

## Página `/croquis`
1. **Topo:** h1 "Croquis", uma linha de texto e a faixa de cores da coleção (as paletas dos 21 looks).
2. **Abas presas** logo abaixo do menu: "Sketchbook" (logo), "À mão" (lápis), "Estudos" (logo). São links de âncora, e a aba da seção visível fica marcada.
3. **Sketchbook:** o provador, com 3 manequins.
   - Desktop: os 3 lado a lado. Celular: carrossel com scroll-snap.
   - Cada manequim empilha os looks da pose. Cada look segue a estrutura `[data-croqui]` (palco + camadas de realce + paleta), e o `destaque-cor.ts` continua funcionando sem mudança.
4. **À mão:** os 3 desenhos ao vivo e o varal.
5. **Estudos:** a leitura guiada.
6. **Visualizador:** um único `<dialog>` na página.

### Sem JS e com movimento reduzido
- **Sem JS:**
  - Provador: grade com todos os looks e paletas.
  - Desenho ao vivo: a imagem final colorida, com as fichas no lugar.
  - Varal: fila rolável.
  - Estudos: todas as pranchas com as anotações em lista.
  - Nada fica escondido.
- **Movimento reduzido:**
  - O provador funciona, com troca instantânea.
  - O desenho ao vivo aparece pronto e as fichas, no lugar.
  - O varal não balança.
  - O visualizador abre sem voo.
  - O zoom dos estudos é um corte direto.

### Scripts
`src/scripts/croquis/`:
- `index.ts` inicia os módulos em `astro:page-load` e limpa em `astro:before-swap`. Depois marca `data-croquis="pronto"` no `<html>`, para os testes.
- Módulos: `provador.ts`, `ao-vivo.ts`, `varal.ts`, `visualizador.ts`, `estudos.ts`, `abas.ts`.

O line-up antigo (`LineUpCroquis.astro`, `animacoes/lineup.ts`) sai.

## Testes
- **Unitários:** marca (SVG), alinhamento, ao vivo (lápis e tempo), conteúdo (paletas medidas em `croqui.jpg`; 21 looks com pose; desenhos e estudos com arquivos gerados presentes).
- **E2E, desktop e celular (Pixel 7):**
  - **Provador:** troca, volta, bolinhas, arraste, teclado, paleta e soltura na troca, palco com a proporção da imagem.
  - **Abas:** links e aba ativa.
  - **Desenho ao vivo:** pinta, persiste, fichas rápidas na rolagem rápida, movimento reduzido.
  - **Varal:** ordem com rascunhos por último, rascunho sem filtro, sapato deitado.
  - **Visualizador:** abre e volta à origem, próxima folha, miniaturas, arraste, lupa acima da folha, Esc.
  - **Estudos:** zoom com o ponto dentro do quadro, troca de prancha, proporção da prancha deitada.
  - **Marca d'água:** imagem servida diferente do original.
  - **Qualidade:** axe, sem rolagem horizontal, sem erros no console.
