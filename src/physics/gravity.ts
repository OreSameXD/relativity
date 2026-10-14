/**
 * Общая теория относительности: несколько проверяемых чисел.
 * Формулы: Шварцшильд (1916); Фламм (1916); Эйнштейн (1915, перигелий Меркурия); Мизнер, Торн, Уилер.
 */
import { C, G, M_SUN, schwarzschildRadius } from './lens';

export { schwarzschildRadius };
export const M_EARTH = 5.9722e24; // кг
export const R_EARTH = 6.371e6; // м, средний радиус

/**
 * Параболоид Фламма: высота поверхности вложения для метрики Шварцшильда,
 * z(r) = 2·√(r_s·(r − r_s)), r ≥ r_s. Это та «воронка», которую рисуют на картинках.
 */
export function flammHeight(r: number, rs: number): number {
  if (r < rs) return 0;
  return 2 * Math.sqrt(rs * (r - rs));
}

/**
 * Смещение перигелия за один оборот (радианы): Δφ = 6πGM / (c²·a·(1 − e²)).
 */
export function perihelionShiftPerOrbit(mass: number, semiMajor: number, eccentricity: number): number {
  return (6 * Math.PI * G * mass) / (C * C * semiMajor * (1 - eccentricity * eccentricity));
}

/** Смещение перигелия за столетие в угловых секундах при известном периоде (в сутках). */
export function perihelionShiftPerCentury(mass: number, semiMajor: number, eccentricity: number, periodDays: number): number {
  const perOrbit = perihelionShiftPerOrbit(mass, semiMajor, eccentricity);
  const orbitsPerCentury = (100 * 365.25) / periodDays;
  return perOrbit * orbitsPerCentury * (180 / Math.PI) * 3600;
}

/** Коэффициент в уравнениях Эйнштейна, 8πG/c⁴, в 1/Н. */
export function einsteinCoupling(): number {
  return (8 * Math.PI * G) / C ** 4;
}

/** Ход часов на расстоянии r от массы с гравитационным радиусом r_s относительно далёких часов: dτ/dt = √(1 − r_s/r). */
export function clockRateFactor(r: number, rs: number): number {
  if (r <= rs) return 0;
  return Math.sqrt(1 - rs / r);
}

/** Гравитационное красное смещение между высотами в слабом поле: Δν/ν ≈ gh/c². */
export function gravitationalRedshift(g: number, height: number): number {
  return (g * height) / (C * C);
}

export const MERCURY = { a: 5.7909e10, e: 0.20563, periodDays: 87.969 };
export { M_SUN };
