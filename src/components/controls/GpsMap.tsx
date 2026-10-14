import { useEffect, useRef, useState } from 'react';
import { DAY, GPS_ORBIT_RADIUS, microsecondsPerDay, netRate, positionError } from '../../physics/gps';

/**
 * Карта с точкой «вы» и точкой «где думает приёмник».
 * Симуляция: 1 сутки = SIM_DAY секунд реального времени. Без поправки ошибка растёт как c·Δt
 * (упрощено: реальный приёмник ошибается сложнее, здесь показана накопленная ошибка часов).
 */
const SIM_DAY = 12;
const KM_PER_PX = 1 / 9; // 9 px на километр
const W = 320;
const H = 170;
const RATE = netRate(GPS_ORBIT_RADIUS);
const US_PER_DAY = microsecondsPerDay(RATE);

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function GpsMap({ correction, running }: { correction: boolean; running: boolean }) {
  const [sim, setSim] = useState({ hours: 0, errorKm: 0, driftUs: 0, angle: 0 });
  const state = useRef({ t: 0, tOff: 0, last: 0 });

  // сброс при включении поправки: приёмник снова знает, где вы
  useEffect(() => {
    if (correction) state.current.tOff = 0;
  }, [correction]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    state.current.last = performance.now();
    const tick = (now: number) => {
      const s = state.current;
      const dt = Math.min(0.1, (now - s.last) / 1000);
      s.last = now;
      s.t += dt;
      if (!correction) s.tOff += dt;
      const seconds = (s.tOff / SIM_DAY) * DAY;
      const errorKm = positionError(seconds) / 1e3;
      const driftUs = (seconds / DAY) * US_PER_DAY;
      setSim({ hours: (s.t / SIM_DAY) * 24, errorKm, driftUs, angle: 0.7 + 0.35 * Math.sin(s.t / 9) });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, correction]);

  const cx = W / 2;
  const cy = H / 2;
  const px = sim.errorKm / KM_PER_PX;
  const maxR = Math.min(W, H) / 2 - 14;
  const r = Math.min(px, maxR);
  const gx = cx + Math.cos(sim.angle) * r;
  const gy = cy - Math.sin(sim.angle) * r;
  const offMap = px > maxR;

  return (
    <div>
      <svg className="gps-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Карта: где вы на самом деле и где думает приёмник">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} className={i % 4 === 2 ? 'avenue' : 'street'} x1={(i + 0.5) * (W / 12)} y1={0} x2={(i + 0.5) * (W / 12)} y2={H} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`h${i}`} className={i % 3 === 1 ? 'avenue' : 'street'} x1={0} y1={(i + 0.5) * (H / 6)} x2={W} y2={(i + 0.5) * (H / 6)} />
        ))}
        {!correction && sim.errorKm > 0.05 && <line className="link" x1={cx} y1={cy} x2={gx} y2={gy} />}
        <circle className="you-ring" cx={cx} cy={cy} r={9} />
        <circle className="you" cx={cx} cy={cy} r={4.5} />
        <text className="label" x={cx + 12} y={cy + 4}>вы</text>
        {!correction && sim.errorKm > 0.05 && (
          <g>
            <circle className="ghost-ring" cx={gx} cy={gy} r={9} />
            <circle className="ghost" cx={gx} cy={gy} r={4.5} />
            <text className="label" x={gx + 12} y={gy + 4}>{offMap ? 'приёмник: за картой' : 'приёмник'}</text>
          </g>
        )}
        <line className="scale" x1={12} y1={H - 12} x2={12 + 5 / KM_PER_PX} y2={H - 12} />
        <text className="label" x={12} y={H - 18}>5 км</text>
      </svg>
      <div className="gps-stats" aria-live="polite" aria-atomic="true" style={{ marginTop: 10 }}>
        <div>
          <span className="label">Прошло</span>
          <span className="num">{sim.hours < 48 ? `${Math.floor(sim.hours)} ч` : `${ru(sim.hours / 24, 1)} сут`}</span>
        </div>
        <div>
          <span className="label">Часы ушли</span>
          <span className={`num ${correction ? '' : 'warm'}`}>{correction ? '0 мкс' : `+${ru(sim.driftUs, 0)} мкс`}</span>
        </div>
        <div>
          <span className="label">Ошибка места</span>
          <span className={`num ${correction ? '' : 'warm'}`}>{correction ? '0 м' : sim.errorKm < 1 ? `${ru(sim.errorKm * 1000, 0)} м` : `${ru(sim.errorKm, 1)} км`}</span>
        </div>
      </div>
    </div>
  );
}
