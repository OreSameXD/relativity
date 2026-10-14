import { useCallback } from 'react';
import { CHAPTERS } from '../../story/chapters';
import { storyStore, useStory } from '../../story/store';
import { LightClockPair } from '../LightClockPair';

/** Глава 1. Световые часы: неподвижные слева, летящие бегут по дорожке справа. */
export default function LightClocks() {
  const beta = useStory((s) => s.clocksBeta);
  const resetKey = useStory((s) => s.clockResetKey);
  const chapter = useStory((s) => s.chapter);
  const portrait = useStory((s) => s.portrait);
  const look = CHAPTERS[1].look;
  const onTicks = useCallback((rest: number, moving: number) => storyStore.getState().setClockTicks(rest, moving), []);

  return (
    <LightClockPair
      beta={beta}
      origin={[look[0] + (portrait ? -6 : 1), look[1] - 3.5, look[2] + 2]}
      trackStart={look[0] + (portrait ? -1 : 5)}
      trackWidth={portrait ? 8 : 9}
      height={6}
      period={2}
      running={chapter === 1}
      resetKey={resetKey}
      onTicks={onTicks}
    />
  );
}
