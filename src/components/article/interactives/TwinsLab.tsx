import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { TwinTrip } from '../../../scene/TwinTrip';
import { gamma } from '../../../physics/lorentz';
import { travelerTime, turnaroundDistanceLy } from '../../../physics/twins';
import { yearsWord } from '../../controls/TwinsControls';

/**
 * Интерактив статьи «Парадокс близнецов»: тот же полёт, что в главе,
 * ползунки подставляют числа в формулу (слоты .slot-tbeta, .slot-tgamma, .slot-tT, .slot-ttau).
 */

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
}

export default function TwinsLab() {
  const [beta, setBeta] = useState(0.8);
  const [years, setYears] = useState(10);
  const [launchKey, setLaunchKey] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'flying' | 'done'>('idle');
  const [age, setAge] = useState({ earth: 0, ship: 0 });
  const [running, setRunning] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const g = gamma(beta);
  const tau = travelerTime(years, beta);

  useEffect(() => {
    setSlot('slot-tbeta', ru(beta, 2));
    setSlot('slot-tgamma', ru(g, 2));
    setSlot('slot-tT', String(years));
    setSlot('slot-ttau', ru(tau, 1));
    setSlot('slot-tdist', ru(turnaroundDistanceLy(years, beta), 1));
  }, [beta, g, years, tau]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const last = useRef(0);
  const onProgress = useCallback((_: number, earth: number, ship: number) => {
    const now = performance.now();
    if (now - last.current < 80) return;
    last.current = now;
    setAge({ earth, ship });
  }, []);
  const onDone = useCallback(() => {
    setPhase('done');
  }, []);

  useEffect(() => {
    if (phase === 'done') setAge({ earth: years, ship: tau });
  }, [phase, years, tau]);

  const launch = () => {
    setAge({ earth: 0, ship: 0 });
    setPhase('flying');
    setLaunchKey((k) => k + 1);
  };
  const flying = phase === 'flying';

  return (
    <div className="lab">
      <div className="lab-canvas" ref={wrap} role="img" aria-label="Земля, корабль и звезда: полёт близнеца туда и обратно; изображение интерактивно">
        <Canvas dpr={1} frameloop={running ? 'always' : 'never'} gl={{ antialias: true, powerPreference: 'low-power', alpha: false }} camera={{ fov: 40, near: 0.1, far: 200, position: [8, 2, 24] }} onCreated={(s) => s.camera.lookAt(8, 0, 0)}>
          <color attach="background" args={['#05060f']} />
          <TwinTrip beta={beta} years={years} launchKey={launchKey} origin={[0, 0, 0]} length={16} running={running} onProgress={onProgress} onDone={onDone} />
        </Canvas>
      </div>

      <div className="lab-controls">
        <label className="lab-row">
          <span className="field-label">
            <span>Скорость корабля</span>
            <span className="num">{ru(beta, 2)} c</span>
          </span>
          <input type="range" min={0.1} max={0.99} step={0.01} value={beta} disabled={flying} onChange={(e) => { setBeta(Number(e.target.value)); setPhase('idle'); setAge({ earth: 0, ship: 0 }); }} aria-valuetext={`${ru(beta, 2)} скорости света`} />
        </label>
        <label className="lab-row">
          <span className="field-label">
            <span>Полёт по часам Земли</span>
            <span className="num">{years} {yearsWord(years)}</span>
          </span>
          <input type="range" min={1} max={50} step={1} value={years} disabled={flying} onChange={(e) => { setYears(Number(e.target.value)); setPhase('idle'); setAge({ earth: 0, ship: 0 }); }} aria-valuetext={`${years} ${yearsWord(years)}`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">На Земле прошло</span>
            <span className="num">{ru(age.earth, 1)} {yearsWord(age.earth)}</span>
          </div>
          <div>
            <span className="label">На корабле прошло</span>
            <span className="num">{ru(age.ship, 1)} {yearsWord(age.ship)}</span>
          </div>
          <div>
            <span className="label">Разница</span>
            <span className="num">{ru(years - tau, 1)} {yearsWord(years - tau)}</span>
          </div>
        </div>
        <div>
          <button type="button" className="btn-primary" disabled={flying} onClick={launch}>
            {phase === 'done' ? 'Ещё раз' : 'Отправить близнеца'}
          </button>
        </div>
        <p className="simplified">Упрощено: разворот мгновенный, ускорение не показано, расстояние на экране не в масштабе</p>
      </div>
    </div>
  );
}
