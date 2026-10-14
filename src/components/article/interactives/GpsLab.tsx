import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GpsConstellation } from '../../../scene/GpsConstellation';
import { GpsMap } from '../../controls/GpsMap';
import { R_EARTH_EQ, gravitationalRate, microsecondsPerDay, netRate, orbitalSpeed, velocityRate } from '../../../physics/gps';

/**
 * Интерактив статьи «GPS и относительность»: высота орбиты → оба вклада и итог
 * (слоты .slot-h, .slot-gg, .slot-gv, .slot-gn), плюс карта с тумблером поправки.
 */

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
}

export default function GpsLab() {
  const [altKm, setAltKm] = useState(20200);
  const [correction, setCorrection] = useState(true);
  const [running, setRunning] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const r = R_EARTH_EQ + altKm * 1e3;
  const grav = microsecondsPerDay(gravitationalRate(r));
  const vel = microsecondsPerDay(velocityRate(r));
  const net = microsecondsPerDay(netRate(r));
  const v = orbitalSpeed(r) / 1e3;

  useEffect(() => {
    setSlot('slot-h', ru(altKm, 0));
    setSlot('slot-gv', ru(v, 2));
    setSlot('slot-gg', (grav >= 0 ? '+' : '') + ru(grav, 1));
    setSlot('slot-gvel', ru(vel, 1));
    setSlot('slot-gn', (net >= 0 ? '+' : '') + ru(net, 1));
  }, [altKm, v, grav, vel, net]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // радиус орбиты на картинке: от 1,07 R (МКС) до 6,6 R (геостационар)
  const orbitRatio = r / R_EARTH_EQ;

  return (
    <div className="lab">
      <div className="lab-canvas" ref={wrap} role="img" aria-label="Земля и спутники на выбранной высоте; изображение интерактивно">
        <Canvas dpr={1} frameloop={running ? 'always' : 'never'} gl={{ antialias: true, powerPreference: 'low-power', alpha: false }} camera={{ fov: 42, near: 0.1, far: 300, position: [0, 14, 44] }} onCreated={(s) => s.camera.lookAt(0, 0, 0)}>
          <color attach="background" args={['#05060f']} />
          <GpsConstellation center={[0, 0, 0]} earthRadius={3} orbitRatio={Math.min(orbitRatio, 6.6)} planes={2} perPlane={3} period={30} running={running} warn={!correction} />
        </Canvas>
      </div>

      <div className="lab-controls">
        <label className="lab-row">
          <span className="field-label">
            <span>Высота орбиты</span>
            <span className="num">{ru(altKm, 0)} км</span>
          </span>
          <input type="range" min={300} max={36000} step={100} value={altKm} onChange={(e) => setAltKm(Number(e.target.value))} aria-valuetext={`${altKm} километров`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">Гравитация</span>
            <span className="num">{grav >= 0 ? '+' : ''}{ru(grav, 1)} мкс/сут</span>
          </div>
          <div>
            <span className="label">Скорость ({ru(v, 2)} км/с)</span>
            <span className="num">{ru(vel, 1)} мкс/сут</span>
          </div>
          <div>
            <span className="label">Итого</span>
            <span className="num" style={{ color: Math.abs(net) < 0.5 ? 'var(--text)' : 'var(--warm)' }}>{net >= 0 ? '+' : ''}{ru(net, 1)} мкс/сут</span>
          </div>
        </div>
        <p className="readout" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {altKm < 3100 ? 'Низкая орбита: скорость важнее, часы отстают, как у близнеца-путешественника.' : altKm < 3300 ? 'Около 3 190 км вклады компенсируются: часы идут в ногу с земными.' : 'Высокая орбита: гравитация важнее, часы убегают вперёд.'}
        </p>
        <button type="button" className="switch" role="switch" aria-checked={correction} onClick={() => setCorrection((c) => !c)}>
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-label">Поправка в приёмнике {correction ? 'включена' : 'выключена'} (для орбиты GPS)</span>
        </button>
        <GpsMap correction={correction} running={running} />
        <p className="simplified">Упрощено: Земля сферическая, орбита круговая, вращение Земли не учтено; ошибка места показана как c·Δt</p>
      </div>
    </div>
  );
}
