import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { storyStore, useStory } from '../../story/store';

/**
 * Управление главой «Гравитационная линза»: чёрная дыра следует за курсором/пальцем,
 * ползунок массы меняет радиус кольца Эйнштейна.
 */
export default function LensControls() {
  const chapter = useStory((s) => s.chapter);
  const mass = useStory((s) => s.lensMass);
  const [touched, setTouched] = useState(false);
  const active = chapter === 4;

  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !touched) return;
      storyStore.getState().setLensTarget(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [active, touched]);

  // На телефоне: перетаскивание по области сцены (ловим pointerdown на секции)
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector<HTMLElement>('[data-chapter="4"] .touch-area');
    if (!el) return;
    const down = (e: PointerEvent) => {
      setTouched(true);
      storyStore.getState().setLensTarget(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    const move = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      storyStore.getState().setLensTarget(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
    };
  }, [active]);

  const rE = (0.08 + mass * 0.2) * 100;
  const massLabel = mass < 0.33 ? 'лёгкая' : mass < 0.66 ? 'средняя' : 'тяжёлая';

  return (
    <motion.div
      className="panel"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: active ? 'auto' : 'none' }}
    >
      <label className="field">
        <span className="field-label">Масса чёрной дыры</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mass}
          aria-valuetext={`радиус кольца ${rE.toFixed(0)} % высоты экрана`}
          onChange={(e) => storyStore.getState().setLensMass(Number(e.target.value))}
        />
      </label>
      <p className="readout">
        {massLabel[0].toUpperCase() + massLabel.slice(1)} чёрная дыра. Радиус кольца Эйнштейна: <span className="num">{rE.toFixed(0)}%</span> высоты кадра
      </p>
      <p className="simplified">Упрощено: тонкая линза, тень и кольцо — декоративны</p>
    </motion.div>
  );
}
