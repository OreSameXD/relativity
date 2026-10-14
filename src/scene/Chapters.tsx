import { Suspense, lazy, useRef, type ComponentType } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { storyStore, useStory } from '../story/store';

/** Ленивые группы глав. Монтируются за одну главу до входа в кадр, размонтируются после. */
const LOADERS: Record<number, ComponentType> = {
  0: lazy(() => import('./chapters/Intro')),
  1: lazy(() => import('./chapters/LightClocks')),
  2: lazy(() => import('./chapters/Twins')),
  3: lazy(() => import('./chapters/Gravity')),
  4: lazy(() => import('./chapters/Lens')),
  5: lazy(() => import('./chapters/Gps')),
  6: lazy(() => import('./chapters/Finale')),
};

/** Момент перелёта, в который старая глава гаснет, а новая появляется (пыль в это время гуще всего). */
const SWITCH = 0.45;

/**
 * Глава видна только пока она текущая: при перелёте к следующей старая исчезает
 * на середине пути, новая появляется там же. Так соседние главы не просвечивают
 * друг сквозь друга (например, скопление главы 4 за Землёй главы 5).
 */
function ChapterGate({ index, children }: { index: number; children: React.ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { chapter, cam } = storyStore.getState();
    const visible = (chapter === index && cam.phase >= SWITCH) || (chapter === index + 1 && cam.phase < SWITCH);
    if (g.visible !== visible) g.visible = visible;
  });
  return <group ref={group}>{children}</group>;
}

export function Chapters() {
  const chapter = useStory((s) => s.chapter);
  return (
    <>
      {Object.entries(LOADERS)
        .filter(([i]) => Math.abs(Number(i) - chapter) <= 1)
        .map(([i, C]) => (
          <Suspense key={i} fallback={null}>
            <ChapterGate index={Number(i)}>
              <C />
            </ChapterGate>
          </Suspense>
        ))}
    </>
  );
}
