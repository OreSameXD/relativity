import { useEffect, useState } from 'react';
import { gamma } from '../../../physics/lorentz';
import { clockRateFactor } from '../../../physics/gravity';

/**
 * Интерактив вводной статьи: три циферблата.
 * Эталонные часы (покой, вдали от масс), часы в полёте (СТО) и часы у массы (ОТО).
 * Слоты формул: .slot-ibeta, .slot-igamma, .slot-ir, .slot-ifactor.
 */

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) el.textContent = text;
  });
}

const BASE_PERIOD = 6; // секунд на оборот у эталонных часов

function Dial({ rate, title, note, accent }: { rate: number; title: string; note: string; accent?: boolean }) {
  const duration = rate > 1e-6 ? BASE_PERIOD / rate : 1e9;
  return (
    <div className={`dial${accent ? ' is-accent' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="dial-face" cx="50" cy="50" r="44" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} className="dial-tick" x1={50 + Math.sin(a) * 38} y1={50 - Math.cos(a) * 38} x2={50 + Math.sin(a) * 42} y2={50 - Math.cos(a) * 42} />;
        })}
        <g className="dial-hand" style={{ animationDuration: `${duration}s` }}>
          <line x1="50" y1="54" x2="50" y2="16" />
        </g>
        <circle className="dial-pin" cx="50" cy="50" r="3" />
      </svg>
      <p className="dial-title">{title}</p>
      <p className="dial-note num">{note}</p>
    </div>
  );
}

export default function IntroLab() {
  const [beta, setBeta] = useState(0.8);
  const [rOverRs, setROverRs] = useState(3);
  const g = gamma(beta);
  const srRate = 1 / g;
  const grRate = clockRateFactor(rOverRs, 1);

  useEffect(() => {
    setSlot('slot-ibeta', ru(beta, 2));
    setSlot('slot-igamma', ru(g, 2));
    setSlot('slot-isr', ru(srRate, 2));
    setSlot('slot-ir', ru(rOverRs, 1));
    setSlot('slot-ifactor', ru(grRate, 2));
  }, [beta, g, srRate, rOverRs, grRate]);

  return (
    <div className="lab">
      <div className="dials">
        <Dial rate={1} title="Вы" note="покой, вдали от масс" />
        <Dial rate={srRate} title="В полёте (СТО)" note={`идут в ${ru(g, 2)} раза медленнее`} accent />
        <Dial rate={grRate} title="У массы (ОТО)" note={grRate > 0 ? `идут в ${ru(1 / grRate, 2)} раза медленнее` : 'на горизонте стоят'} accent />
      </div>
      <div className="lab-controls">
        <label className="lab-row">
          <span className="field-label">
            <span>Скорость летящих часов (СТО)</span>
            <span className="num">{ru(beta, 2)} c</span>
          </span>
          <input type="range" min={0} max={0.99} step={0.01} value={beta} onChange={(e) => setBeta(Number(e.target.value))} aria-valuetext={`${ru(beta, 2)} скорости света`} />
        </label>
        <label className="lab-row">
          <span className="field-label">
            <span>Расстояние часов от чёрной дыры (ОТО), в гравитационных радиусах</span>
            <span className="num">{ru(rOverRs, 1)} r<sub>s</sub></span>
          </span>
          <input type="range" min={1.05} max={20} step={0.05} value={rOverRs} onChange={(e) => setROverRs(Number(e.target.value))} aria-valuetext={`${ru(rOverRs, 1)} гравитационных радиусов`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">γ (СТО)</span>
            <span className="num">{ru(g, 2)}</span>
          </div>
          <div>
            <span className="label">√(1 − r<sub>s</sub>/r) (ОТО)</span>
            <span className="num">{ru(grRate, 3)}</span>
          </div>
          <div>
            <span className="label">Для сравнения</span>
            <span className="num" style={{ fontSize: '0.9rem' }}>Земля: r/r<sub>s</sub> ≈ 7·10⁸, отставание 7·10⁻¹⁰</span>
          </div>
        </div>
        <p className="simplified">Упрощено: часы у массы считаются неподвижными относительно неё, ход показан относительно далёкого наблюдателя</p>
      </div>
    </div>
  );
}
