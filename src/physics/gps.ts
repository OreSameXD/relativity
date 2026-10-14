/**
 * Относительность в GPS: ход спутниковых часов относительно наземных.
 * Формулы: Ashby N. Relativity in the Global Positioning System (Living Rev. Relativity, 2003).
 * Модель упрощена: Земля сферическая, орбита круговая, вращение Земли и геоид не учитываются.
 */
import { C } from './lorentz';

export const GM_EARTH = 3.986004418e14; // м³/с², геоцентрическая гравитационная постоянная
export const R_EARTH_EQ = 6.378137e6; // м, экваториальный радиус (WGS 84)
export const GPS_ORBIT_RADIUS = 2.6562e7; // м, ≈ 20 200 км высоты
export const DAY = 86400;

/** Скорость на круговой орбите радиуса r: v = √(GM/r). */
export function orbitalSpeed(r: number): number {
  return Math.sqrt(GM_EARTH / r);
}

/** Гравитационный вклад: часы выше в потенциале идут быстрее. Δf/f = (GM/c²)(1/R − 1/r). */
export function gravitationalRate(r: number, rGround: number = R_EARTH_EQ): number {
  return (GM_EARTH / (C * C)) * (1 / rGround - 1 / r);
}

/** Скоростной вклад: движущиеся часы идут медленнее. Δf/f = −v²/(2c²). */
export function velocityRate(r: number): number {
  const v = orbitalSpeed(r);
  return -(v * v) / (2 * C * C);
}

/** Суммарный относительный уход хода часов спутника на круговой орбите радиуса r. */
export function netRate(r: number, rGround: number = R_EARTH_EQ): number {
  return gravitationalRate(r, rGround) + velocityRate(r);
}

/** Уход часов за сутки в микросекундах для относительной скорости хода. */
export function microsecondsPerDay(rate: number): number {
  return rate * DAY * 1e6;
}

/** Ошибка положения, если не вводить поправку: Δx = c·Δt. Возвращает метры. */
export function positionError(seconds: number, rate: number = netRate(GPS_ORBIT_RADIUS)): number {
  return C * rate * seconds;
}

/** Радиус орбиты, на котором гравитационный и скоростной вклады компенсируются: r = 1,5·R. */
export function cancellationRadius(rGround: number = R_EARTH_EQ): number {
  return 1.5 * rGround;
}
