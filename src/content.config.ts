import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Статьи: по одной на явление + вводная. Порядок задаёт `order`,
 * `chapter` связывает статью с главой истории (ссылка «назад к истории» → /#chapter).
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    /** Короткое название явления для карточек и «следующее явление» */
    phenomenon: z.string(),
    description: z.string(),
    /** Суть в 2–3 предложениях, показывается в шапке статьи */
    lead: z.string(),
    order: z.number().int(),
    /** id главы истории: intro | clocks | twins | gravity | lens | gps */
    chapter: z.string().optional(),
    updated: z.coerce.date(),
    /** Статья готова к публикации; черновики не попадают в оглавление */
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
