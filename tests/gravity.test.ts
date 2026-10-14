import { describe, expect, it } from 'vitest';
import { M_SUN } from '../src/physics/lens';
import {
  MERCURY,
  M_EARTH,
  clockRateFactor,
  einsteinCoupling,
  flammHeight,
  gravitationalRedshift,
  perihelionShiftPerCentury,
  perihelionShiftPerOrbit,
  schwarzschildRadius,
} from '../src/physics/gravity';

describe('кривизна пространства-времени', () => {
  it('гравитационный радиус: Солнце 2,95 км, Земля 8,9 мм', () => {
    expect(schwarzschildRadius(M_SUN) / 1e3).toBeCloseTo(2.95, 2);
    expect(schwarzschildRadius(M_EARTH) * 1e3).toBeCloseTo(8.87, 1);
  });

  it('параболоид Фламма: нуль на горизонте, растёт как корень', () => {
    expect(flammHeight(1, 1)).toBe(0);
    expect(flammHeight(5, 1)).toBeCloseTo(4, 10);
    expect(flammHeight(0.5, 1)).toBe(0);
  });

  it('перигелий Меркурия: 0,10″ за оборот, 43″ за столетие', () => {
    const perOrbit = perihelionShiftPerOrbit(M_SUN, MERCURY.a, MERCURY.e);
    expect(perOrbit * (180 / Math.PI) * 3600).toBeCloseTo(0.1035, 3);
    expect(perihelionShiftPerCentury(M_SUN, MERCURY.a, MERCURY.e, MERCURY.periodDays)).toBeCloseTo(43.0, 0);
  });

  it('часы на поверхности Земли отстают от далёких на 7·10⁻¹⁰, на горизонте стоят', () => {
    const rs = schwarzschildRadius(M_EARTH);
    expect((1 - clockRateFactor(6.371e6, rs)) / 1e-10).toBeCloseTo(6.96, 1);
    expect(clockRateFactor(rs, rs)).toBe(0);
    expect(1 - clockRateFactor(1.5 * rs, rs)).toBeCloseTo(1 - Math.sqrt(1 / 3), 10);
  });

  it('коэффициент уравнений Эйнштейна 8πG/c⁴ ≈ 2,08·10⁻⁴³ Н⁻¹', () => {
    expect(einsteinCoupling() / 1e-43).toBeCloseTo(2.08, 2);
  });

  it('Паунд и Ребка: 22,5 м в поле Земли дают сдвиг 2,5·10⁻¹⁵', () => {
    expect(gravitationalRedshift(9.81, 22.5) / 1e-15).toBeCloseTo(2.46, 1);
  });
});
