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

const croquis = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/croquis' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      ordem: z.number().int(),
      imagem: image(),
      alt: z.string().min(1, 'Descreva o croqui (texto alternativo)'),
      paleta: z
        .array(z.object({ hex: corHex, nome: z.string().min(1) }))
        .min(3, 'A paleta precisa de 3 a 4 cores')
        .max(4, 'A paleta precisa de 3 a 4 cores')
        .optional(),
    }),
});

export const collections = { colecoes, pecas, sobre, croquis };
