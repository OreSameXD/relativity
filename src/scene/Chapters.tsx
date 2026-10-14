import { Suspense, lazy, type ComponentType } from 'react';
import { useStory } from '../story/store';

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

export function Chapters() {
  const chapter = useStory((s) => s.chapter);
  return (
    <>
      {Object.entries(LOADERS)
        .filter(([i]) => Math.abs(Number(i) - chapter) <= 1)
        .map(([i, C]) => (
          <Suspense key={i} fallback={null}>
            <C />
          </Suspense>
        ))}
    </>
  );
}
