import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SpacetimeGrid, type GridMass, type MassKind } from '../../../scene/SpacetimeGrid';
import { M_SUN, schwarzschildRadius } from '../../../physics/lens';

/**
 * Интерактив статьи «Искривление пространства-времени»: та же сетка, что в главе.
 * Клик кладёт массу, ползунок массы подставляет r_s в формулу (слоты .slot-gm, .slot-grs).
 */

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
}

export default function GravityLab() {
  const [masses, setMasses] = useState<GridMass[]>([{ x: 0, z: 0, kind: 'star' }]);
  const [kind, setKind] = useState<MassKind>('star');
  const [solarMasses, setSolarMasses] = useState(1);
  const [running, setRunning] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const rsKm = schwarzschildRadius(solarMasses * M_SUN) / 1e3;

  useEffect(() => {
    setSlot('slot-gm', ru(solarMasses, 0));
    setSlot('slot-grs', solarMasses >= 10 ? ru(rsKm, 0) : ru(rsKm, 2));
  }, [solarMasses, rsKm]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPlace = useCallback(
    (x: number, z: number) => {
      setMasses((ms) => {
        if (ms.some((m) => Math.hypot(m.x - x, m.z - z) < 3)) return ms;
        const next = [...ms, { x, z, kind }];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });
    },
    [kind],
  );

  return (
    <div className="lab">
      <div className="lab-canvas" ref={wrap} role="img" aria-label="Сетка пространства-времени с массами и планетами; изображение интерактивно">
        <Canvas dpr={1} frameloop={running ? 'always' : 'never'} gl={{ antialias: true, powerPreference: 'low-power', alpha: false }} camera={{ fov: 42, near: 0.1, far: 300, position: [0, 24, 34] }} onCreated={(s) => s.camera.lookAt(0, -3, 0)}>
          <color attach="background" args={['#05060f']} />
          <SpacetimeGrid center={[0, 0, 0]} width={52} depth={36} segments={130} masses={masses} planets={6} running={running} onPlace={onPlace} />
        </Canvas>
        <p className="lab-hint">Нажмите на сетку, чтобы положить массу</p>
      </div>

      <div className="lab-controls">
        <div className="lab-row">
          <span className="field-label"><span>Что положить</span></span>
          <div className="seg" role="group" aria-label="Тип массы">
            <button type="button" className="seg-btn" aria-pressed={kind === 'star'} onClick={() => setKind('star')}>Звезда</button>
            <button type="button" className="seg-btn" aria-pressed={kind === 'hole'} onClick={() => setKind('hole')}>Чёрная дыра</button>
            <button type="button" className="seg-btn" onClick={() => setMasses([])}>Очистить</button>
          </div>
        </div>
        <label className="lab-row">
          <span className="field-label">
            <span>Масса для формулы 2</span>
            <span className="num">{ru(solarMasses, 0)} M☉</span>
          </span>
          <input type="range" min={1} max={100} step={1} value={solarMasses} onChange={(e) => setSolarMasses(Number(e.target.value))} aria-valuetext={`${solarMasses} масс Солнца`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">Гравитационный радиус r<sub>s</sub></span>
            <span className="num">{solarMasses >= 10 ? ru(rsKm, 0) : ru(rsKm, 2)} км</span>
          </div>
          <div>
            <span className="label">Для сравнения</span>
            <span className="num" style={{ fontSize: '0.95rem' }}>Солнце 2,95 км, Земля 8,9 мм</span>
          </div>
        </div>
        <p className="simplified">Упрощено: воронка нарисована условно, глубина не связана с ползунком, планеты движутся по Ньютону</p>
      </div>
    </div>
  );
}
