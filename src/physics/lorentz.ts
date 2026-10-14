/**
 * Специальная теория относительности: чистые функции.
 * Формулы: Эйнштейн (1905); Тейлор, Уилер «Физика пространства-времени»; Ландау, Лифшиц т. II, § 3.
 */

export const C = 2.99792458e8; // м/с, точно

/** Лоренц-фактор γ = 1/√(1 − β²), β = v/c. */
export function gamma(beta: number): number {
  if (beta < 0 || beta >= 1) throw new RangeError('β должна быть в [0, 1)');
  return 1 / Math.sqrt(1 - beta * beta);
}

/** Интервал по часам наблюдателя Δt для собственного интервала Δτ движущихся часов: Δt = γ·Δτ. */
export function dilate(properInterval: number, beta: number): number {
  return gamma(beta) * properInterval;
}

/** Собственное время движущихся часов за интервал Δt наблюдателя: Δτ = Δt/γ. */
export function properTime(observerInterval: number, beta: number): number {
  return observerInterval / gamma(beta);
}

/** Период световых часов с расстоянием между зеркалами L (туда и обратно) в их системе покоя: T₀ = 2L/c. */
export function lightClockPeriod(mirrorDistance: number): number {
  return (2 * mirrorDistance) / C;
}

/** β по известному γ: β = √(1 − 1/γ²). */
export function betaFromGamma(g: number): number {
  if (g < 1) throw new RangeError('γ должна быть ≥ 1');
  return Math.sqrt(1 - 1 / (g * g));
}
