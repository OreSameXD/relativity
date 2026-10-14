import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { gamma } from '../../physics/lorentz';
import { travelerTime, turnaroundDistanceLy } from '../../physics/twins';
import { storyStore, useStory } from '../../story/store';

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Склонение: 1 год, 2 года, 5 лет */
export function yearsWord(n: number): string {
  const r = Math.round(n * 10) / 10;
  const i = Math.round(r);
  const m10 = i % 10;
  const m100 = i % 100;
  if (r !== i) return 'года';
  if (m10 === 1 && m100 !== 11) return 'год';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'года';
  return 'лет';
}

/** Управление главой «Парадокс близнецов»: скорость, длительность, запуск и счётчики возраста. */
export default function TwinsControls() {
  const chapter = useStory((s) => s.chapter);
  const beta = useStory((s) => s.twinsBeta);
  const years = useStory((s) => s.twinsYears);
  const phase = useStory((s) => s.twinsPhase);
  const [age, setAge] = useState({ earth: 0, ship: 0 });
  const active = chapter === 2;
  const g = gamma(beta);
  const flying = phase === 'flying';

  // Счётчики читаем из мутируемого объекта симуляции, пока идёт полёт
  useEffect(() => {
    if (!flying) return;
    let raf = 0;
    const tick = () => {
      const sim = storyStore.getState().twinsSim;
      setAge((a) => (Math.abs(a.earth - sim.earthYears) > 0.05 ? { earth: sim.earthYears, ship: sim.shipYears } : a));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flying]);

  useEffect(() => {
    if (phase === 'done') setAge({ earth: years, ship: travelerTime(years, beta) });
    if (phase === 'idle') setAge({ earth: 0, ship: 0 });
  }, [phase, years, beta]);

  const diff = years - travelerTime(years, beta);

  return (
    <motion.div
      className="panel"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: active ? 'auto' : 'none' }}
    >
      <label className="field">
        <span className="field-label field-label-row">
          <span>Скорость корабля</span>
          <span className="num">{ru(beta, 2)} c</span>
        </span>
        <input type="range" min={0.1} max={0.99} step={0.01} value={beta} disabled={flying} aria-valuetext={`${ru(beta, 2)} скорости света`} onChange={(e) => { storyStore.getState().setTwinsBeta(Number(e.target.value)); storyStore.getState().resetTwins(); }} />
      </label>
      <label className="field">
        <span className="field-label field-label-row">
          <span>Полёт по часам Земли</span>
          <span className="num">{years} {yearsWord(years)}</span>
        </span>
        <input type="range" min={1} max={50} step={1} value={years} disabled={flying} aria-valuetext={`${years} ${yearsWord(years)}`} onChange={(e) => { storyStore.getState().setTwinsYears(Number(e.target.value)); storyStore.getState().resetTwins(); }} />
      </label>

      <div className="ticks" aria-live="polite" aria-atomic="true">
        <div>
          <span className="ticks-label">На Земле прошло</span>
          <span className="ticks-value num">{ru(age.earth, 1)}</span>
          <span className="ticks-unit">{yearsWord(age.earth)}</span>
        </div>
        <div>
          <span className="ticks-label">На корабле прошло</span>
          <span className="ticks-value num warm">{ru(age.ship, 1)}</span>
          <span className="ticks-unit">{yearsWord(age.ship)}</span>
        </div>
        <button type="button" className="btn-primary" disabled={flying} onClick={() => storyStore.getState().launchTwins()}>
          {phase === 'done' ? 'Ещё раз' : 'Отправить'}
        </button>
      </div>

      <p className="readout">
        {phase === 'done' ? (
          <>
            Близнец с корабля вернулся на <strong className="num">{ru(diff, 1)}</strong> {yearsWord(diff)} моложе. γ = <span className="num">{ru(g, 2)}</span>, разворот на расстоянии <span className="num">{ru(turnaroundDistanceLy(years, beta), 1)}</span> св. лет.
          </>
        ) : (
          <>
            γ = <span className="num">{ru(g, 2)}</span>: на корабле пройдёт <span className="num">{ru(travelerTime(years, beta), 1)}</span> {yearsWord(travelerTime(years, beta))} вместо {years}.
          </>
        )}
      </p>
      <p className="simplified">Упрощено: разворот мгновенный, ускорение не показано</p>
    </motion.div>
  );
}
