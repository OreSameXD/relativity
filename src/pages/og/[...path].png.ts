import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

/**
 * OG-картинки на сборке: /og/home.png, /og/articles.png, /og/articles/<slug>.png.
 * satori → SVG → sharp → PNG 1200×630. Шрифты — статичные woff из @fontsource.
 */

interface Props {
  title: string;
  subtitle: string;
  kicker: string;
}

export const prerender = true;

export async function getStaticPaths() {
  const articles = (await getCollection('articles')).filter((a) => !a.data.draft);
  return [
    { params: { path: 'home' }, props: { kicker: 'Интерактивная история', title: 'Время относительно', subtitle: 'Теория относительности Эйнштейна в 3D: часы, близнецы, кривизна, линза и GPS' } },
    { params: { path: 'articles' }, props: { kicker: 'Оглавление', title: 'Статьи', subtitle: 'Как открыли, формулы с числами, интерактив и источники' } },
    ...articles.map((a) => ({
      params: { path: `articles/${a.id}` },
      props: { kicker: a.data.phenomenon, title: a.data.title, subtitle: a.data.description },
    })),
  ];
}

const font = (pkg: string, file: string) => readFile(path.resolve(process.cwd(), 'node_modules/@fontsource', pkg, 'files', file));

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker } = props as Props;
  // Подзаголовок в одну-две строки: длинное описание обрезаем по слову
  const raw = (props as Props).subtitle;
  const subtitle = raw.length > 95 ? raw.slice(0, 95).replace(/[\s,:;]+\S*$/, '') + '…' : raw;
  const [unbC, unbL, manC, manL] = await Promise.all([
    font('unbounded', 'unbounded-cyrillic-700-normal.woff'),
    font('unbounded', 'unbounded-latin-700-normal.woff'),
    font('manrope', 'manrope-cyrillic-400-normal.woff'),
    font('manrope', 'manrope-latin-400-normal.woff'),
  ]);

  const el = {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 72,
        backgroundColor: '#05060f',
        backgroundImage: 'radial-gradient(circle at 78% 38%, rgba(109,93,252,0.45) 0%, rgba(11,15,42,0.6) 32%, #05060f 70%)',
        color: '#e9f1ff',
        fontFamily: 'Manrope, ManropeLatin',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              right: 150,
              top: 130,
              width: 220,
              height: 220,
              borderRadius: 110,
              border: '10px solid #ffb454',
              boxShadow: '0 0 60px rgba(255,180,84,0.55)',
              backgroundColor: '#000',
              display: 'flex',
            },
            children: [],
          },
        },
        {
          type: 'div',
          props: {
            // Текст ставим по фиксированной верхней координате: satori занижает высоту
            // многострочных блоков при выравнивании по низу, и подзаголовок уезжал за край.
            style: { position: 'absolute', left: 72, top: 270, width: 860, display: 'flex', flexDirection: 'column' },
            children: [
              { type: 'div', props: { style: { fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: '#7d87a8', marginBottom: 16, display: 'flex' }, children: kicker } },
              { type: 'div', props: { style: { fontFamily: 'Unbounded, UnboundedLatin', fontSize: title.length > 28 ? 46 : 60, lineHeight: 1.1, display: 'flex' }, children: title } },
              { type: 'div', props: { style: { fontSize: 26, lineHeight: 1.35, color: '#c8d0e6', marginTop: 18, maxWidth: 760, display: 'flex' }, children: subtitle } },
            ],
          },
        },
        { type: 'div', props: { style: { position: 'absolute', left: 72, top: 60, fontSize: 20, letterSpacing: 3, color: '#7d87a8', textTransform: 'uppercase', fontFamily: 'Unbounded, UnboundedLatin', display: 'flex' }, children: 'gargantua.space' } },
      ],
    },
  };

  const svg = await satori(el as never, {
    width: 1200,
    height: 630,
    fonts: [
      // satori не объединяет файлы одного семейства: латиница и кириллица идут как разные семейства,
      // а fontFamily перечисляет оба — satori берёт глиф из первого шрифта, где он есть.
      { name: 'Unbounded', data: unbC, weight: 700, style: 'normal' },
      { name: 'UnboundedLatin', data: unbL, weight: 700, style: 'normal' },
      { name: 'Manrope', data: manC, weight: 400, style: 'normal' },
      { name: 'ManropeLatin', data: manL, weight: 400, style: 'normal' },
    ],
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
};
