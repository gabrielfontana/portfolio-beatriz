import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const corHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use cor hex de 6 dígitos entre aspas, ex.: "#ff2e88"');

const colecoes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/colecoes' }),
  schema: z.object({
    nome: z.string(),
    cor: corHex,
    ordem: z.number().int(),
    ano: z.number().int(),
    resumo: z.string(),
  }),
});

const pecas = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/pecas' }),
  schema: ({ image }) => {
    const etapa = z.object({ imagem: image(), alt: z.string().min(1), texto: z.string().min(1) });
    return z.object({
      titulo: z.string(),
      colecao: reference('colecoes'),
      ano: z.number().int(),
      tecido: z.string(),
      tecnica: z.string(),
      destaque: z.boolean().default(false),
      capa: image(),
      capaAlt: z.string().min(1, 'Descreva a foto de capa (texto alternativo)'),
      galeria: z.array(z.object({ src: image(), alt: z.string().min(1) })).default([]),
      processo: z.object({ croqui: etapa, molde: etapa, costura: etapa, final: etapa }).optional(),
    });
  },
});

const sobre = defineCollection({
  loader: glob({ pattern: 'sobre.md', base: './src/content/sobre' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      cargo: z.string(),
      cidade: z.string(),
      retrato: image(),
      retratoAlt: z.string().min(1),
      entrevista: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).min(1),
      trajetoria: z.array(
        z
          .object({
            inicio: z.number().int(),
            fim: z.number().int().nullable(),
            tipo: z.enum(['formacao', 'experiencia']),
            titulo: z.string(),
            local: z.string(),
            descricao: z.string().optional(),
          })
          .refine((i) => i.fim === null || i.fim >= i.inicio, 'O ano de fim não pode ser antes do início'),
      ),
      habilidades: z.array(z.string()).min(1),
    }),
});

// Croquis do Sketchbook. `imagem` é GERADA pelo npm run croquis a partir do `original.*` da pasta
// (alinhada pela cabeça num quadro comum + marca d'água); o original nunca é alterado.
const croquis = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/croquis' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      ordem: z.number().int(),
      // Pose da figura: looks da mesma pose são o mesmo "manequim" no provador.
      pose: z.enum(['a', 'b', 'c'], { message: 'A pose precisa ser a, b ou c' }),
      imagem: image(),
      alt: z.string().min(1, 'Descreva o croqui (texto alternativo)'),
      paleta: z
        .array(z.object({ hex: corHex, nome: z.string().min(1) }))
        .min(1, 'A paleta precisa de 1 a 4 cores principais')
        .max(4, 'A paleta precisa de 1 a 4 cores principais')
        .optional(),
    }),
});

// Desenhos à mão. Cada pasta é um grupo de folhas (ex.: croqui + fichas técnicas). As `folha-N.jpg`
// são GERADAS a partir de `original-N.*` (giradas se pedido + marca d'água).
const desenhos = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/desenhos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(), // só para quem edita; não aparece no site
      ordem: z.number().int(),
      tipo: z.enum(['colorido', 'rascunho'], { message: 'O tipo precisa ser colorido ou rascunho' }),
      // Desenho ao vivo (mesa de luz): a 1ª folha é desenhada na tela e as outras entram como fichas técnicas.
      aoVivo: z.boolean().default(false),
      folhas: z
        .array(
          z.object({
            imagem: image(),
            alt: z.string().min(1, 'Descreva a folha (texto alternativo)'),
            girar: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
          }),
        )
        .min(1, 'O grupo precisa de pelo menos uma folha'),
    }),
});

// Estudos do Sketchbook com leitura guiada. `imagem` é GERADA a partir do `original.*` (marca d'água).
const estudos = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/estudos' }),
  schema: ({ image }) =>
    z.object({
      ordem: z.number().int(),
      imagem: image(),
      alt: z.string().min(1, 'Descreva o estudo (texto alternativo)'),
      // Pontos sobre as anotações do desenho: x e y em % da imagem, texto legível da anotação.
      anotacoes: z
        .array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), texto: z.string().min(1) }))
        .min(1, 'O estudo precisa de pelo menos uma anotação'),
    }),
});

export const collections = { colecoes, pecas, sobre, croquis, desenhos, estudos };
