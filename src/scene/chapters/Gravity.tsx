import { useCallback } from 'react';
import { CHAPTERS } from '../../story/chapters';
import { storyStore, useStory } from '../../story/store';
import { SpacetimeGrid } from '../SpacetimeGrid';

/** Глава 3. Сетка пространства-времени под углом к камере; массы кладутся кликом. */
export default function Gravity() {
  const masses = useStory((s) => s.gravityMasses);
  const chapter = useStory((s) => s.chapter);
  const look = CHAPTERS[3].look;
  const onPlace = useCallback((x: number, z: number) => {
    if (storyStore.getState().chapter !== 3) return;
    storyStore.getState().addGravityMass(x, z);
  }, []);

  return (
    <SpacetimeGrid
      center={[look[0] + 6, look[1] - 2, look[2]]}
      width={64}
      depth={46}
      segments={160}
      masses={masses}
      planets={9}
      running={chapter === 3}
      onPlace={onPlace}
    />
  );
}
