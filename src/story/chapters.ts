/**
 * Единый список глав истории. Отсюда читают: разметка секций (высоты),
 * мастер-таймлайн (длительности), камера (якоря) и ленивая загрузка сцены.
 *
 * Единица длительности = один экран (100vh) прокрутки.
 */
export type Vec3 = [number, number, number];

export interface ChapterDef {
  /** 0..6 */
  index: number;
  id: string;
  title: string;
  /** Позиция камеры в «удержании» */
  anchor: Vec3;
  /** Куда смотрит камера в «удержании» */
  look: Vec3;
  /** Длительность перелёта к этой главе (экранов). У интро 0. */
  travel: number;
  /** Длительность удержания (экранов) */
  hold: number;
  /** Ссылка «Подробнее» */
  article?: string;
}

export const CHAPTERS: ChapterDef[] = [
  { index: 0, id: 'intro',   title: 'Время относительно',        anchor: [0, 0, 0],       look: [0, 0, -60],    travel: 0, hold: 1.5 },
  { index: 1, id: 'clocks',  title: 'Световые часы',             anchor: [14, 3, -42],    look: [14, 0, -70],   travel: 1, hold: 1.5, article: '/articles/time-dilation' },
  { index: 2, id: 'twins',   title: 'Парадокс близнецов',        anchor: [-12, -5, -86],  look: [-12, -2, -120],travel: 1, hold: 1.5, article: '/articles/twin-paradox' },
  { index: 3, id: 'gravity', title: 'Гравитация гнёт пространство', anchor: [10, 12, -128], look: [8, 0, -160], travel: 1, hold: 1.5, article: '/articles/curved-spacetime' },
  { index: 4, id: 'lens',    title: 'Гравитационная линза',      anchor: [0, 0, -170],    look: [0, 0, -230],   travel: 1, hold: 1.5, article: '/articles/gravitational-lensing' },
  { index: 5, id: 'gps',     title: 'Зачем это в жизни: GPS',    anchor: [-16, 5, -214],  look: [-14, 0, -250], travel: 1, hold: 1.5, article: '/articles/gps' },
  { index: 6, id: 'finale',  title: 'Финал',                     anchor: [0, 26, -262],   look: [0, 0, -120],   travel: 1, hold: 1 },
];

/** Доля удержания, после которой текст считается полностью показанным (точка snap). */
export const HOLD_SETTLE = 0.25;
/** Доля удержания, с которой текст начинает уходить. */
export const HOLD_LEAVE = 0.8;

export const TOTAL_UNITS = CHAPTERS.reduce((s, c) => s + c.travel + c.hold, 0);

/** Начало главы (в единицах прокрутки) */
export function chapterStart(index: number): number {
  let s = 0;
  for (let i = 0; i < index; i++) s += CHAPTERS[i].travel + CHAPTERS[i].hold;
  return s;
}

/** Точка «кадра» главы, куда «доезжает» snap (в единицах прокрутки) */
export function chapterSettle(index: number): number {
  const c = CHAPTERS[index];
  return chapterStart(index) + c.travel + c.hold * HOLD_SETTLE;
}
