import { describe, expect, it } from 'vitest';
import {
  AU,
  GPC,
  KPC,
  M_SUN,
  R_SUN,
  deflectionAngle,
  einsteinRadius,
  imagePositions,
  magnification,
  radToArcsec,
  radToMas,
  schwarzschildRadius,
} from '../src/physics/lens';

describe('гравитационная линза', () => {
  it('радиус Шварцшильда Солнца ≈ 2,95 км', () => {
    expect(schwarzschildRadius(M_SUN) / 1e3).toBeCloseTo(2.953, 2);
  });

  it('отклонение у края Солнца ≈ 1,75″ (Эйнштейн, 1915)', () => {
    expect(radToArcsec(deflectionAngle(M_SUN, R_SUN))).toBeCloseTo(1.75, 2);
  });

  it('отклонение луча на 1 а.е. от Солнца (90° от Солнца) ≈ 4 мсд (упрощённая оценка)', () => {
    // В 90° от Солнца формула α = 4GM/(c²b) завышает вдвое; точное значение 2GM/(c²d) ≈ 4,07 мсд
    expect(radToMas(deflectionAngle(M_SUN, AU)) / 2).toBeCloseTo(4.07, 1);
  });

  it('звезда 1 M☉ на 4 кпк, источник на 8 кпк: θ_E ≈ 1 мсд (микролинзирование)', () => {
    const thetaE = einsteinRadius(M_SUN, 4 * KPC, 8 * KPC, 4 * KPC);
    expect(radToMas(thetaE)).toBeCloseTo(1.0, 1);
  });

  it('галактика 10¹² M☉ на 1 Гпк, источник на 2 Гпк: θ_E ≈ 2″', () => {
    const thetaE = einsteinRadius(1e12 * M_SUN, 1 * GPC, 2 * GPC, 1 * GPC);
    expect(radToArcsec(thetaE)).toBeCloseTo(2.02, 1);
  });

  it('источник на оси даёт кольцо радиуса θ_E', () => {
    const { plus, minus } = imagePositions(0, 1);
    expect(plus).toBeCloseTo(1);
    expect(minus).toBeCloseTo(-1);
  });

  it('источник на β = θ_E: изображения на 1,618 и −0,618 θ_E, усиление 1,34', () => {
    const { plus, minus } = imagePositions(1, 1);
    expect(plus).toBeCloseTo(1.618, 3);
    expect(minus).toBeCloseTo(-0.618, 3);
    const m = magnification(1, 1);
    expect(m.total).toBeCloseTo(3 / Math.sqrt(5), 3);
    expect(m.plus - m.minus).toBeCloseTo(1, 6);
  });
});
