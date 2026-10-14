/**
 * Парадокс близнецов: полёт туда-обратно с мгновенным разворотом (упрощено).
 * Формулы: Эйнштейн (1905, § 4); Ланжевен (1911); Бонди, k-исчисление; Тейлор, Уилер.
 */
import { gamma } from './lorentz';

/** Собственное время путешественника за полёт длительностью T по часам Земли: τ = T/γ. */
export function travelerTime(earthYears: number, beta: number): number {
  return earthYears / gamma(beta);
}

/** Расстояние до точки разворота в световых годах: d = β·T/2 (T в годах, скорость в долях c). */
export function turnaroundDistanceLy(earthYears: number, beta: number): number {
  return (beta * earthYears) / 2;
}

/** То же расстояние в системе корабля (сокращение длины): d/γ. */
export function contractedDistanceLy(earthYears: number, beta: number): number {
  return turnaroundDistanceLy(earthYears, beta) / gamma(beta);
}

/** Доплеровский множитель Бонди: k = √((1+β)/(1−β)). Во столько раз реже приходят сигналы при удалении и чаще при сближении. */
export function bondiK(beta: number): number {
  return Math.sqrt((1 + beta) / (1 - beta));
}

/**
 * Что видит каждый близнец по k-исчислению (в годах).
 * Путешественник: половину своего времени видит Землю замедленной в k раз, половину — ускоренной.
 * Земля: видит корабль замедленным до прихода сигнала о развороте, потом ускоренным.
 */
export function whatTheySee(earthYears: number, beta: number) {
  const k = bondiK(beta);
  const tau = travelerTime(earthYears, beta);
  const travelerSeesEarth = { outbound: tau / 2 / k, inbound: (tau / 2) * k };
  // Сигнал о развороте приходит на Землю через T/2 + d = T/2·(1+β) лет
  const earthSlowPhase = (earthYears / 2) * (1 + beta);
  const earthSeesShip = { slow: earthSlowPhase / k, fast: (earthYears - earthSlowPhase) * k };
  return { k, tau, travelerSeesEarth, earthSeesShip };
}
