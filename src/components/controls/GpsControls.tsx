import { motion } from 'motion/react';
import { storyStore, useStory } from '../../story/store';
import { GpsMap } from './GpsMap';

/** Управление главой «GPS»: тумблер поправки и карта с уплывающей точкой. */
export default function GpsControls() {
  const chapter = useStory((s) => s.chapter);
  const correction = useStory((s) => s.gpsCorrection);
  const active = chapter === 5;

  return (
    <motion.div
      className="panel"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: active ? 'auto' : 'none' }}
    >
      <button type="button" className="switch" role="switch" aria-checked={correction} onClick={() => storyStore.getState().setGpsCorrection(!correction)}>
        <span className="switch-track" aria-hidden="true" />
        <span className="switch-label">Релятивистская поправка {correction ? 'включена' : 'выключена'}</span>
      </button>
      <GpsMap correction={correction} running={active} />
      <p className="readout" style={{ fontSize: '0.82rem' }}>
        Гравитация: <span className="num">+45,7</span>, скорость: <span className="num">−7,2</span>, итого <span className="num">+38,4</span> мкс/сут. Сутки на карте = 12 с.
      </p>
      <p className="simplified">Упрощено: ошибка показана как c·Δt, реальный приёмник ошибается сложнее</p>
    </motion.div>
  );
}
