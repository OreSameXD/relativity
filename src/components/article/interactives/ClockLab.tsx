import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { LightClockPair } from '../../../scene/LightClockPair';
import { gamma, lightClockPeriod } from '../../../physics/lorentz';

/**
 * Облегчённый интерактив статьи «Замедление времени»: та же пара световых часов,
 * ползунок β подставляет числа в формулу (слоты .slot-beta, .slot-gamma, .slot-t).
 */

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Склонение: 1 тик, 2 тика, 5 тиков */
function ticksWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'тик';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'тика';
  return 'тиков';
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
}

const T0_NS = lightClockPeriod(1) * 1e9; // зеркала на 1 м: 6,67 нс

export default function ClockLab() {
  const [beta, setBeta] = useState(0.6);
  const [ticks, setTicks] = useState({ rest: 0, moving: 0 });
  const [resetKey, setResetKey] = useState(0);
  const [running, setRunning] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const g = gamma(beta);

  useEffect(() => {
    setSlot('slot-beta', ru(beta, 2));
    setSlot('slot-beta2', ru(beta * beta, 2));
    setSlot('slot-gamma', ru(g, 2));
    setSlot('slot-t', ru(T0_NS * g, 2));
  }, [beta, g]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onTicks = useCallback((rest: number, moving: number) => setTicks({ rest, moving }), []);

  return (
    <div className="lab">
      <div className="lab-canvas" ref={wrap} role="img" aria-label="Двое световых часов: неподвижные и летящие; изображение интерактивно">
        <Canvas dpr={1} frameloop={running ? 'always' : 'never'} gl={{ antialias: true, powerPreference: 'low-power', alpha: false }} camera={{ fov: 42, near: 0.1, far: 200, position: [1, 3, 21] }} onCreated={(s) => s.camera.lookAt(1, 3, 0)}>
          <color attach="background" args={['#05060f']} />
          <LightClockPair beta={beta} origin={[-7, 0, 0]} trackStart={-3} trackWidth={13} height={6} period={2} running={running} resetKey={resetKey} onTicks={onTicks} />
        </Canvas>
      </div>

      <div className="lab-controls">
        <label className="lab-row">
          <span className="field-label">
            <span>Скорость летящих часов</span>
            <span className="num">{ru(beta, 2)} c</span>
          </span>
          <input type="range" min={0} max={0.99} step={0.01} value={beta} onChange={(e) => setBeta(Number(e.target.value))} aria-valuetext={`${ru(beta, 2)} скорости света`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">Лоренц-фактор γ</span>
            <span className="num">{ru(g, 2)}</span>
          </div>
          <div>
            <span className="label">Неподвижные</span>
            <span className="num">{ticks.rest} {ticksWord(ticks.rest)}</span>
          </div>
          <div>
            <span className="label">Летящие</span>
            <span className="num">{ticks.moving} {ticksWord(ticks.moving)}</span>
          </div>
        </div>
        <div>
          <button type="button" className="btn-ghost" onClick={() => setResetKey((k) => k + 1)}>
            Сбросить счётчики
          </button>
        </div>
        <p className="simplified">Упрощено: часы летят по кругу, сокращение длины не показано, скорость света на экране условна</p>
      </div>
    </div>
  );
}
