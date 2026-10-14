import { describe, expect, it } from 'vitest';
import {
  DAY,
  GPS_ORBIT_RADIUS,
  R_EARTH_EQ,
  cancellationRadius,
  gravitationalRate,
  microsecondsPerDay,
  netRate,
  orbitalSpeed,
  positionError,
  velocityRate,
} from '../src/physics/gps';

describe('относительность в GPS', () => {
  it('скорость спутника GPS ≈ 3,87 км/с', () => {
    expect(orbitalSpeed(GPS_ORBIT_RADIUS) / 1e3).toBeCloseTo(3.87, 2);
  });

  it('гравитация: +45,7 мкс/сут; скорость: −7,2 мкс/сут; итого +38,4 мкс/сут', () => {
    expect(microsecondsPerDay(gravitationalRate(GPS_ORBIT_RADIUS))).toBeCloseTo(45.7, 1);
    expect(microsecondsPerDay(velocityRate(GPS_ORBIT_RADIUS))).toBeCloseTo(-7.2, 1);
    expect(microsecondsPerDay(netRate(GPS_ORBIT_RADIUS))).toBeCloseTo(38.4, 1);
  });

  it('частота бортового генератора: 10,23 МГц смещают на −4,46·10⁻¹⁰', () => {
    expect(netRate(GPS_ORBIT_RADIUS) / 1e-10).toBeCloseTo(4.45, 1);
  });

  it('без поправки ошибка положения растёт на ≈ 11,5 км в сутки', () => {
    expect(positionError(DAY) / 1e3).toBeCloseTo(11.5, 0);
  });

  it('на высоте 0,5 R⊕ (≈ 3 190 км) вклады компенсируются', () => {
    const r = cancellationRadius();
    expect((r - R_EARTH_EQ) / 1e3).toBeCloseTo(3189, 0);
    expect(microsecondsPerDay(netRate(r))).toBeCloseTo(0, 6);
  });

  it('МКС (420 км): часы отстают, скорость важнее гравитации', () => {
    expect(microsecondsPerDay(netRate(R_EARTH_EQ + 4.2e5))).toBeLessThan(0);
  });
});
