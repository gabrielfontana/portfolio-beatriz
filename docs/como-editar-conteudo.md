# Como editar o conteúdo do site da Beatriz

Tudo que muda com frequência fica em `src/content/`, `src/data/site.json` e `public/`. Não é preciso mexer em componentes.

## Rodar o site no computador
```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:4321 e atualiza sozinho ao salvar
```

## Como o site está organizado
O site é **uma página só** (`/`), lida de cima para baixo:
1. **Sobre:** retrato, nome, um texto curto, habilidades e o botão do currículo.
2. **Croquis:** o Sketchbook, os desenhos à mão e os estudos.
3. **Contato:** WhatsApp, e-mail e Instagram, fechando a página.

O menu leva a cada uma dessas partes.

## Sobre, currículo e contatos
- Nome, cargo, cidade, texto de abertura (abaixo do `---`) e habilidades: `src/content/sobre/sobre.md`.
- Retrato: `src/content/sobre/retrato.jpg`.
- CV em PDF: substitua `public/cv-beatriz.pdf`. A trajetória completa fica nele.
- WhatsApp, e-mail e Instagram: `src/data/site.json`.
- Imagem de prévia de link (WhatsApp, redes): o primeiro look do Sketchbook.

## Trocar placeholders por fotos reais
Substitua o arquivo mantendo o mesmo nome (ex.: `retrato.jpg`). O comando `npm run placeholders` **nunca** sobrescreve arquivos existentes. Ele só recria o que estiver faltando.

## Croquis
A seção de croquis tem três partes, e o conteúdo de cada uma fica numa pasta própria:
- **Desenhados no Sketchbook:** o provador.
- **Desenhados à mão:** o desenho ao vivo e o mural.
- **Estudos no Sketchbook:** as anotações guiadas.

**Regra de ouro:** a imagem que você coloca se chama `original…` e **nunca é alterada**. As imagens que o site mostra são **geradas** a partir dela pelo `npm run croquis`. Esse comando alinha os croquis, gira as folhas quando pedido e grava a marca d'água "Beatriz Chiusi". Depois de mexer em qualquer imagem ou `index.md` dessas pastas, rode:
```bash
npm run croquis
```

### Look do Sketchbook (provador)
Crie `src/content/croquis/look-NN/` com o arquivo do app como `original.png` (ou `.jpg`) e um `index.md`:
```md
---
titulo: Look 22
ordem: 22
pose: a
imagem: ./croqui.jpg
alt: Descrição do desenho para quem não enxerga.
---
```
- **`pose`:** diz em qual manequim o look entra.
  - `a`: braço aberto, cabelo preso;
  - `b`: mãos na cintura;
  - `c`: em pé, braços soltos.
  - Os looks da mesma pose trocam de roupa "no mesmo corpo". O script alinha todos pela cabeça.
- **Paleta:** o `npm run croquis` também sugere a paleta (de 1 a 4 cores principais da roupa), grava em `paleta:` e gera as máscaras `mascara-*.png` do destaque de cor.
  - Ficam de fora fundo, pele, cabelo, cores ínfimas e cores que só aparecem em traços.
  - Não gostou de uma cor? Edite `paleta:` à mão (hex **entre aspas**, ex.: `"#bf343a"`) e rode de novo. Sua paleta é mantida e só as máscaras são refeitas.

### Desenho à mão (desenho ao vivo e mural)
Cada pasta em `src/content/desenhos/` é um grupo de folhas presas juntas, como o croqui com as fichas técnicas. As folhas são `original-1.jpg`, `original-2.jpg`… e o `index.md` fica assim:
```md
---
titulo: "Look completo 4"   # só para você; não aparece no site
ordem: 4
tipo: colorido              # ou rascunho (lápis: vai para o canto de rascunhos do mural, sem efeito de grafite)
aoVivo: true                # opcional: entra como "desenho ao vivo" na mesa de luz
folhas:
  - imagem: ./folha-1.jpg
    alt: "Croqui de …"
  - imagem: ./folha-2.jpg
    alt: "Ficha técnica, frente: …"
    girar: 270              # opcional: 90, 180 ou 270 (sentido horário) para folha escaneada de lado
---
```
- **Desenho ao vivo:** a 1ª folha é desenhada na tela, e as outras entram ao lado como fichas técnicas.
- **Mural:** sem `aoVivo`, o grupo vai para o mural, preso com alfinete ou fita.
- **Manchas amarelas de papel antigo:** os originais de hoje já foram limpos. Se chegar um desenho novo manchado, peça a limpeza antes de colocar.

### Estudo do Sketchbook (leitura guiada)
Crie `src/content/estudos/estudo-N/` com `original.png` e um `index.md`:
```md
---
ordem: 8
imagem: ./prancha.jpg
alt: "Estudo de …"
anotacoes:
  - x: 24        # para onde o zoom vai, em % da largura da imagem
    y: 11        # em % da altura
    texto: "O que a anotação diz (não aparece no site)."
---
```
Na tela não aparece nenhuma anotação: o visitante só usa os botões "Começar"/"Próximo", e a prancha aproxima cada ponto na ordem da lista. Coloque o `x`/`y` no centro do detalhe que deve ficar em foco. O `texto` é obrigatório, mas só fica guardado (serve de referência e para leitores de tela no futuro).

### Se esquecer de rodar o script
O build e os testes avisam qual pasta e qual arquivo faltam.

## Antes de publicar
```bash
npm run build && npm test && npx playwright test
```
Tudo verde = pode publicar a pasta `dist/` (Netlify ou Vercel). Atualize `site` em `astro.config.mjs` com a URL final, para as prévias de link apontarem para o endereço certo.
