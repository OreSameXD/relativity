/**
 * Ссылки с учётом base (на GitHub Pages сайт живёт в подпапке /relativity).
 * href('/articles') → '/relativity/articles'. Внешние адреса не трогаем.
 */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function href(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith('#')) return path;
  return base + path;
}
