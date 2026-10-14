import { motion } from 'motion/react';
import { storyStore, useStory } from '../../story/store';

/** Управление главой «Гравитация гнёт пространство»: выбор массы, подсказка, очистка. */
export default function GravityControls() {
  const chapter = useStory((s) => s.chapter);
  const kind = useStory((s) => s.gravityKind);
  const masses = useStory((s) => s.gravityMasses);
  const active = chapter === 3;

  return (
    <motion.div
      className="panel"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: active ? 'auto' : 'none' }}
    >
      <p className="field-label">Что положить на сетку</p>
      <div className="seg" role="group" aria-label="Тип массы">
        <button type="button" className="seg-btn" aria-pressed={kind === 'star'} onClick={() => storyStore.getState().setGravityKind('star')}>
          Звезда
        </button>
        <button type="button" className="seg-btn" aria-pressed={kind === 'hole'} onClick={() => storyStore.getState().setGravityKind('hole')}>
          Чёрная дыра
        </button>
      </div>
      <p className="readout">
        {masses.length === 0 ? (
          <>Нажмите на сетку справа. Пока на ней нет масс, планеты летят по прямой.</>
        ) : (
          <>
            На сетке <span className="num">{masses.length}</span> из 6. Планеты катятся по изгибу: ближе к массе быстрее.
          </>
        )}
      </p>
      <div>
        <button type="button" className="btn-ghost" disabled={masses.length === 0} onClick={() => storyStore.getState().clearGravityMasses()}>
          Очистить
        </button>
      </div>
      <p className="simplified">Упрощено: воронка нарисована условно, планеты движутся по Ньютону</p>
    </motion.div>
  );
}
