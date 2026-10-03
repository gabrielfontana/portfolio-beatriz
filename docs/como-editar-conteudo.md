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

## Croquis e paletas
Cada croqui fica em `src/content/croquis/look-NN/` com `croqui.jpeg` e um `index.md`:
```md
---
titulo: Look 10
ordem: 10
imagem: ./croqui.jpeg
alt: Descrição do desenho para quem não enxerga.
---
```
1. Use nomes de arquivo em minúsculas (`croqui.jpeg`) e fotos em JPG/PNG; HEIC precisa ser convertido.
2. Rode `npm run paletas`. O script sugere de 1 a 4 cores principais da roupa, grava em `paleta:` no `index.md` e gera as máscaras `mascara-*.png` do efeito de destaque. Ficam de fora fundo, pele, cabelo, cores ínfimas (menos de 5% da roupa) e cores que só aparecem em traços, contornos e costuras.
3. Não gostou de uma cor? Edite `paleta:` à mão (hex **entre aspas**, ex.: `"#bf343a"`) e rode `npm run paletas` de novo: sua paleta é mantida e só as máscaras são refeitas.
   Se uma cor escrita à mão for ínfima ou só de traço, o script avisa (sem mexer na paleta) para você tirá-la.
4. Se esquecer de rodar o script, o build avisa qual look e qual cor precisam dele.

## Antes de publicar
```bash
npm run build && npm test && npx playwright test
```
Tudo verde = pode publicar a pasta `dist/` (Netlify ou Vercel). Atualize `site` em `astro.config.mjs` com a URL final, para as prévias de link apontarem para o endereço certo.
