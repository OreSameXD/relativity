import { describe, expect, it } from 'vitest';
import { bondiK, contractedDistanceLy, travelerTime, turnaroundDistanceLy, whatTheySee } from '../src/physics/twins';

describe('парадокс близнецов', () => {
  it('0,8c, 10 лет по Земле: путешественнику 6 лет, разворот на 4 св. годах', () => {
    expect(travelerTime(10, 0.8)).toBeCloseTo(6, 10);
    expect(turnaroundDistanceLy(10, 0.8)).toBeCloseTo(4, 10);
    expect(contractedDistanceLy(10, 0.8)).toBeCloseTo(2.4, 10);
  });

  it('k-множитель Бонди при 0,8c равен 3, при 0,6c равен 2', () => {
    expect(bondiK(0.8)).toBeCloseTo(3, 10);
    expect(bondiK(0.6)).toBeCloseTo(2, 10);
  });

  it('k-исчисление сходится: каждый насчитывает правильный возраст другого', () => {
    const s = whatTheySee(10, 0.8);
    // Путешественник: 3 года видит Землю в 3 раза медленнее (1 год), 3 года — в 3 раза быстрее (9 лет)
    expect(s.travelerSeesEarth.outbound).toBeCloseTo(1, 10);
    expect(s.travelerSeesEarth.inbound).toBeCloseTo(9, 10);
    expect(s.travelerSeesEarth.outbound + s.travelerSeesEarth.inbound).toBeCloseTo(10, 10);
    // Земля: 9 лет видит корабль медленным (3 года), 1 год — быстрым (3 года)
    expect(s.earthSeesShip.slow).toBeCloseTo(3, 10);
    expect(s.earthSeesShip.fast).toBeCloseTo(3, 10);
    expect(s.earthSeesShip.slow + s.earthSeesShip.fast).toBeCloseTo(s.tau, 10);
  });

  it('Ланжевен (1911): при γ = 100 два года в полёте — двести лет на Земле', () => {
    const beta = Math.sqrt(1 - 1 / 100 ** 2);
    expect(travelerTime(200, beta)).toBeCloseTo(2, 6);
  });
});
