import { motion } from 'motion/react';
import { gamma } from '../../physics/lorentz';
import { storyStore, useStory } from '../../story/store';

function ru(n: number, digits: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Управление главой «Световые часы»: ползунок скорости, лоренц-фактор, счётчики тиков. */
export default function LightClockControls() {
  const chapter = useStory((s) => s.chapter);
  const beta = useStory((s) => s.clocksBeta);
  const ticks = useStory((s) => s.clockTicks);
  const active = chapter === 1;
  const g = gamma(beta);

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
          <span>Скорость летящих часов</span>
          <span className="num">{ru(beta, 2)} c</span>
        </span>
        <input
          type="range"
          min={0}
          max={0.99}
          step={0.01}
          value={beta}
          aria-valuetext={`${ru(beta, 2)} скорости света`}
          onChange={(e) => storyStore.getState().setClocksBeta(Number(e.target.value))}
        />
      </label>

      <div className="gamma" aria-live="off">
        <span className="gamma-label">Лоренц-фактор γ</span>
        <span className="gamma-value num">{ru(g, 2)}</span>
        <span className="gamma-note">летящие часы тикают в {ru(g, 2)} раза реже</span>
      </div>

      <div className="ticks" aria-live="polite" aria-atomic="true">
        <div>
          <span className="ticks-label">Неподвижные</span>
          <span className="ticks-value num">{ticks.rest}</span>
          <span className="ticks-unit">тиков</span>
        </div>
        <div>
          <span className="ticks-label">Летящие</span>
          <span className="ticks-value num warm">{ticks.moving}</span>
          <span className="ticks-unit">тиков</span>
        </div>
        <button type="button" className="btn-ghost" onClick={() => storyStore.getState().resetClocks()}>
          Сбросить
        </button>
      </div>
      <p className="simplified">Упрощено: часы летят по кругу, их длина не сокращена</p>
    </motion.div>
  );
}
