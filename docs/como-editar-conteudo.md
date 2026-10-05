# Como editar o conteúdo do site da Beatriz

Tudo que muda com frequência fica em `src/content/`, `src/data/site.json` e `public/`. Não é preciso mexer em componentes.

## Rodar o site no computador
```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:4321 e atualiza sozinho ao salvar
```

## Adicionar uma peça
1. Crie a pasta `src/content/pecas/<nome-da-peca>/` (sem acentos, com hífens). O nome vira a URL: `/pecas/<nome-da-peca>`.
2. Coloque as fotos em JPG ou PNG dentro dela. Fotos HEIC do iPhone precisam ser convertidas para JPG antes.
3. Crie `index.md` copiando o de `macacao-ponte` (mínimo) ou o de `vestido-aurora` (com galeria e processo).
4. `colecao:` precisa ser o nome de um arquivo de `src/content/colecoes/` (sem `.md`).
5. Toda foto precisa de um texto alternativo (`capaAlt`, `alt`) que descreva a imagem para quem não enxerga.
6. `destaque: true` coloca a peça na capa do site. Use em uma peça só.
7. Rode `npm run dev` e confira. Se faltar algum campo, o terminal diz qual.

Galeria e processo são opcionais: sem eles, a página da peça simplesmente não mostra essas seções. O processo precisa das quatro etapas (`croqui`, `molde`, `costura`, `final`), cada uma com `imagem`, `alt` e `texto`.

## Trocar placeholders por fotos reais
Substitua o arquivo mantendo o mesmo nome (ex.: `capa.jpg`). O comando `npm run placeholders` **nunca** sobrescreve arquivos existentes. Ele só recria o que estiver faltando.

## Nova coleção
Crie `src/content/colecoes/<nome>.md` com `nome`, `cor` (hex **entre aspas**, ex.: `"#ff2e88"`), `ordem`, `ano`, `resumo` e um texto curto abaixo do `---`. A cor do texto sobre o bloco colorido é escolhida automaticamente para manter a leitura.

## Sobre, currículo e contatos
- Entrevista, trajetória e habilidades: `src/content/sobre/sobre.md`. Em trabalho atual, use `fim: null`.
- Retrato: `src/content/sobre/retrato.jpg`.
- CV em PDF: substitua `public/cv-beatriz.pdf`.
- WhatsApp, e-mail, Instagram, edição da capa e chamadas: `src/data/site.json`.
- Imagem de prévia de link (WhatsApp, redes): `src/assets/og-padrao.jpg` (1200×630). Peças, coleções e a página Sobre usam a própria foto.

## Página de croquis
A página tem três partes, e o conteúdo de cada uma fica numa pasta própria:
- **Desenhados no Sketchbook:** o provador.
- **Desenhados à mão:** o desenho ao vivo e o varal.
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

### Desenho à mão (desenho ao vivo e varal)
Cada pasta em `src/content/desenhos/` é um grupo de folhas presas juntas, como o croqui com as fichas técnicas. As folhas são `original-1.jpg`, `original-2.jpg`… e o `index.md` fica assim:
```md
---
titulo: "Look completo 4"   # só para você; não aparece no site
ordem: 4
tipo: colorido              # ou rascunho (lápis: vai para o fim do varal, sem efeito de grafite)
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
- **Varal:** sem `aoVivo`, o grupo vai para o varal.
- **Manchas amarelas de papel antigo:** os originais de hoje já foram limpos. Se chegar um desenho novo manchado, peça a limpeza antes de colocar.

### Estudo do Sketchbook (leitura guiada)
Crie `src/content/estudos/estudo-N/` com `original.png` e um `index.md`:
```md
---
ordem: 8
imagem: ./prancha.jpg
alt: "Estudo de …"
anotacoes:
  - x: 24        # posição do ponto, em % da largura da imagem
    y: 11        # em % da altura
    texto: "O que a anotação diz, escrito por extenso."
---
```
Os pontos aparecem numerados na ordem da lista. Prefira posicioná-los **ao lado** da anotação escrita, não em cima dela. **Os textos das anotações de hoje foram transcritos dos desenhos e precisam ser conferidos pela Beatriz.**

### Se esquecer de rodar o script
O build e os testes avisam qual pasta e qual arquivo faltam.

## Antes de publicar
```bash
npm run build && npm test && npx playwright test
```
Tudo verde = pode publicar a pasta `dist/` (Netlify ou Vercel). Atualize `site` em `astro.config.mjs` com a URL final, para as prévias de link apontarem para o endereço certo.
