/**
 * Гравитационная линза точечной массы: чистые функции в СИ.
 * Формулы: Narayan & Bartelmann (1996), Schneider, Ehlers & Falco (1992).
 */

export const G = 6.6743e-11; // м³·кг⁻¹·с⁻², CODATA 2018
export const C = 2.99792458e8; // м/с, точно
export const M_SUN = 1.98892e30; // кг (±0.00025e30)
export const R_SUN = 6.957e8; // м, номинальный радиус Солнца (IAU 2015)
export const AU = 1.495978707e11; // м, точно
export const PC = 3.0856775814913673e16; // м
export const KPC = 1e3 * PC;
export const MPC = 1e6 * PC;
export const GPC = 1e9 * PC;
export const RAD_TO_ARCSEC = (180 / Math.PI) * 3600;

/** Гравитационный радиус (радиус Шварцшильда) r_s = 2GM/c². */
export function schwarzschildRadius(mass: number): number {
  return (2 * G * mass) / (C * C);
}

/**
 * Угол отклонения луча массой M на прицельном расстоянии b (слабое поле):
 * α = 4GM / (c² b). Возвращает радианы.
 */
export function deflectionAngle(mass: number, impactParameter: number): number {
  return (4 * G * mass) / (C * C * impactParameter);
}

/**
 * Угловой радиус кольца Эйнштейна:
 * θ_E = sqrt( 4GM/c² · D_LS / (D_L · D_S) ). Расстояния — угловые, в метрах. Радианы.
 */
export function einsteinRadius(mass: number, dL: number, dS: number, dLS: number): number {
  return Math.sqrt(((4 * G * mass) / (C * C)) * (dLS / (dL * dS)));
}

/**
 * Уравнение линзы точечной массы: β = θ − θ_E²/θ.
 * Для источника на угловом расстоянии β от оси даёт два изображения θ±.
 * Единицы любые, одинаковые для β и θ_E.
 */
export function imagePositions(beta: number, thetaE: number): { plus: number; minus: number } {
  const root = Math.sqrt(beta * beta + 4 * thetaE * thetaE);
  return { plus: (beta + root) / 2, minus: (beta - root) / 2 };
}

/**
 * Усиление каждого изображения и суммарное для точечной линзы.
 * u = β/θ_E. μ± = (u² + 2) / (2u√(u²+4)) ± 1/2, μ = (u² + 2) / (u√(u²+4)).
 */
export function magnification(beta: number, thetaE: number): { plus: number; minus: number; total: number } {
  const u = Math.abs(beta) / thetaE;
  if (u === 0) return { plus: Infinity, minus: Infinity, total: Infinity };
  const s = Math.sqrt(u * u + 4);
  const base = (u * u + 2) / (2 * u * s);
  return { plus: base + 0.5, minus: base - 0.5, total: 2 * base };
}

export function radToArcsec(rad: number): number {
  return rad * RAD_TO_ARCSEC;
}

export function radToMas(rad: number): number {
  return rad * RAD_TO_ARCSEC * 1e3;
}
