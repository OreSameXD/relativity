// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://gargantua.space',
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    // Формулы рендерятся на сборке; на клиент KaTeX не уезжает.
    // trust: разрешаем только \htmlClass — для «живых» слотов подстановки в статьях.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeKatex, { trust: (/** @type {{ command: string }} */ ctx) => ctx.command === '\\htmlClass', strict: 'ignore' }],
      ],
    }),
  },
  vite: {
    ssr: { noExternal: ['postprocessing'] },
  },
});
