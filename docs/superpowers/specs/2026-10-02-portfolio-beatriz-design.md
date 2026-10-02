# Portfólio da Beatriz: spec de design (v1)

## Contexto
O Gabriel quer criar um site de portfólio para a namorada, Beatriz. Ela é modelista: faz croquis, moldes, corte, costura e as peças prontas, e é apaixonada por revistas de moda (Vogue). O site vai servir ao mesmo tempo de **vitrine** (clientes, colaborações) e de **currículo** (vagas em marcas e confecções). O link vai ser enviado a outras pessoas, então o site precisa abrir bem no celular e gerar uma prévia bonita no WhatsApp. Ele deve ser animado, interativo, colorido e chamativo, e não pode parecer um "slide genérico".

A pasta `c:\Users\gabri\Documents\Projetos\portfolio-beatriz` está vazia e não é um repositório git, então é um projeto novo (caminho arquitetural).

### Decisões tomadas com o usuário
- Público: empregadores e clientes, em equilíbrio.
- Conteúdo atual: algumas fotos soltas do celular. A v1 sai com conteúdo provisório.
- Quem atualiza: o Gabriel, editando arquivos de conteúdo (sem CMS).
- Seções: Criações/Coleções, Processo, Sobre + Currículo, Contato.
- Estética: **revista editorial pop** (estilo Vogue).
- Idioma: só português.
- Stack: **Astro + GSAP**, site estático.

## Experiência ("a revista da Beatriz")
1. **Capa (home)**: foto de look em destaque, com o nome BEATRIZ gigante em serifa Didone e a foto sobreposta às letras. Chamadas de capa servem de links para as seções. Na entrada, letras e chamadas aparecem em sequência.
2. **Coleções (sumário)**: grade assimétrica, com um bloco de cor vibrante por coleção. No hover, a cor inunda o card e a foto ganha zoom.
3. **Página da peça**: formato de matéria, com foto principal, galeria, ficha técnica (tecido, técnica, ano) e texto curto.
4. **Processo** (destaque): scroll guiado em 4 atos, Croqui → Molde → Corte e costura → Peça pronta. As imagens ficam presas na tela (pin) enquanto o texto rola. É opcional por peça.
5. **Sobre + Currículo**: entrevista em formato P&R, linha do tempo animada (formação e experiências), habilidades e um botão "Baixar CV (PDF)".
6. **Contato**: rodapé "expediente", com links diretos para WhatsApp (`wa.me`), e-mail e Instagram. Sem formulário na v1.

**Visual:** fundo creme/papel; blocos rosa-choque, vermelho e azul-cobalto; texto preto. Serifa display de alto contraste (ex.: Playfair Display / Bodoni Moda via Google Fonts) com uma sans moderna (ex.: Inter). **Movimento:** transições de página com virada (View Transitions do Astro), revelação de texto linha a linha e parallax nas fotos. Tudo respeita `prefers-reduced-motion`.

## Arquitetura
```
src/
  content/
    config.ts            → schemas Zod das collections
    colecoes/*.md        → nome, corDestaque, ordem, descricao
    pecas/<slug>/index.md + imagens  → titulo, colecao (ref), tecido, tecnica, ano,
                                       destaque, capa, galeria[], processo? {croqui, molde, costura, final}
    sobre.md             → entrevista + formacao[], experiencias[], habilidades[]
  data/site.json         → nome, contatos, chamadas de capa, SEO
  components/            → Capa, CardColecao, GaleriaPeca, FichaTecnica, ProcessoScroll,
                           LinhaDoTempo, Expediente, Navegacao
  layouts/Revista.astro  → layout base (fontes, meta OG, nav, expediente, ViewTransitions)
  pages/                 → index, colecoes/index, colecoes/[slug], pecas/[slug], processo, sobre
  scripts/animacoes/     → módulos GSAP ativados por data-anim="revelar|parallax|pin|..."
  styles/tokens.css      → cores, tipografia e espaçamentos como variáveis CSS
public/cv-beatriz.pdf
```
- Imagens via `astro:assets` (`<Image>`/`<Picture>`), com WebP/AVIF responsivos e lazy loading.
- Animações desacopladas dos componentes por meio de atributos `data-anim`, com GSAP + ScrollTrigger carregados só onde são usados.
- Conteúdo provisório: 2 coleções, cerca de 6 peças, 1 processo completo, textos-modelo e um CV PDF provisório.

## Qualidade
- Mobile-first. Abaixo de ~768px, o pin do Processo vira uma sequência vertical.
- Meta: Lighthouse ≥ 90 em performance e acessibilidade. Inclui alt text, contraste AA, navegação por teclado e reduced-motion.
- SEO e compartilhamento: title, description e imagem Open Graph por página.
- Publicação: build estático pronto para Netlify ou Vercel. O deploy em si fica fora da v1.

## Fora do escopo da v1
CMS/painel, formulário de contato, versão em inglês, deploy e domínio.

## Verificação
- `npx astro check`: tipos e schemas de conteúdo sem erros.
- `npm run build`: build limpo.
- Playwright: a capa carrega; todas as coleções e peças abrem; o link do CV retorna o PDF; não há links internos quebrados; o layout funciona em viewport mobile e desktop.
- Lighthouse rodado localmente (`npm run preview`) na capa e em uma página de peça.
- Revisão visual manual em desktop e celular, incluindo o modo de movimento reduzido.

## Próximos passos (após aprovar esta spec)
1. `git init`, salvar esta spec em `docs/superpowers/specs/2026-10-02-portfolio-beatriz-design.md` e fazer o commit.
2. Invocar o skill **writing-plans** para gerar o plano de implementação detalhado, que você revisa e para o qual escolhe o modo de execução.
