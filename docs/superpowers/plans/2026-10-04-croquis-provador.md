# Página de croquis: provador, desenhos à mão e estudos (plano de implementação)

**Spec:** `docs/superpowers/specs/2026-10-04-croquis-provador-design.md`

**Restrições:**
- **Versões:** Astro 5.18.x.
- **Idioma:** português no código.
- **Libs:** as de `src/lib` importadas pelo Node não têm imports e só usam TS apagável.
- **Movimento reduzido:** toda animação precisa funcionar com ele.
- **Sem commits:** o Gabriel commita.

## Tarefas
1. **Libs puras + testes unitários**
   - `src/lib/marca.ts`: `svgMarca(largura, altura, nome)`.
   - `src/lib/alinhamento.ts`: `centroDaCabeca`, `enquadrar`.
   - `src/lib/ao-vivo.ts`: `camadaLapis`, `mapaDeTempo`.
2. **Script `scripts/gerar-croquis.mjs`** + `npm run croquis` (que roda o de paletas no fim). Gera `croqui.jpg`, `folha-N.jpg`, `lapis.png`, `tempo.png` e `prancha.jpg`. O `sharp.cache(false)` é necessário no Windows.
3. **Conteúdo**
   - Mover os 9 looks antigos para os novos números. Criar os 21 `look-NN`, os grupos de `desenhos/` e os `estudos/`, com originais copiados de `img/` e `index.md`: alt, pose, ordem, folhas, anotações (provisórias).
   - Schemas em `content.config.ts`.
   - Rodar `npm run croquis`.
4. **Visual e componentes**
   - Logo do Sketchbook em `src/assets/croquis/sketchbook.png`.
   - Componentes em `src/components/croquis/`: `Abas`, `Provador`, `LookProvador` (substitui o `CroquiCard`), `DesenhoAoVivo`, `Varal`, `Visualizador`, `Estudos`.
   - Nova `src/pages/croquis.astro`.
   - Remover `LineUpCroquis.astro` e `animacoes/lineup.ts`.
5. **Scripts de interação:** `src/scripts/croquis/*.ts`, com `data-croquis="pronto"`.
6. **Testes:**
   - Reescrever `tests/e2e/croquis.spec.ts`, com desktop e celular.
   - Ajustar `tests/unit/croquis-conteudo.test.ts` (`croqui.jpg`) e criar testes de conteúdo para `desenhos` e `estudos`.
7. **Docs:** `docs/como-editar-conteudo.md` (novo fluxo) e `CLAUDE.md` (seção Croquis).
8. **Verificação:** `npx astro check`, `npm test` e `npx playwright test` (desktop + mobile).
