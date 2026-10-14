import { describe, expect, it } from 'vitest';
import { betaFromGamma, dilate, gamma, lightClockPeriod, properTime } from '../src/physics/lorentz';

describe('лоренц-фактор и замедление времени', () => {
  it('γ при известных скоростях', () => {
    expect(gamma(0)).toBe(1);
    expect(gamma(0.5)).toBeCloseTo(1.1547, 4);
    expect(gamma(0.8)).toBeCloseTo(5 / 3, 6);
    expect(gamma(0.9)).toBeCloseTo(2.2942, 4);
    expect(gamma(0.99)).toBeCloseTo(7.0888, 4);
  });

  it('β по γ обратима', () => {
    expect(betaFromGamma(gamma(0.6))).toBeCloseTo(0.6, 10);
    expect(betaFromGamma(29.3)).toBeCloseTo(0.99942, 5);
  });

  it('световые часы с L = 1 м: T₀ = 6,67 нс, при 0,8c период 11,1 нс', () => {
    const t0 = lightClockPeriod(1);
    expect(t0 * 1e9).toBeCloseTo(6.671, 3);
    expect(dilate(t0, 0.8) * 1e9).toBeCloseTo(11.12, 2);
  });

  it('мюон в кольце ЦЕРН (γ = 29,3): время жизни 2,197 мкс → 64,4 мкс', () => {
    const beta = betaFromGamma(29.3);
    expect(dilate(2.197e-6, beta) * 1e6).toBeCloseTo(64.4, 1);
  });

  it('МКС, 7,66 км/с: за год бортовые часы отстают примерно на 0,01 с (только скорость)', () => {
    const beta = 7.66e3 / 2.99792458e8;
    const year = 365.25 * 86400;
    expect(year - properTime(year, beta)).toBeCloseTo(0.0103, 3);
  });
});
