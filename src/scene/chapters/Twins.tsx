import { useCallback } from 'react';
import { CHAPTERS } from '../../story/chapters';
import { storyStore, useStory } from '../../story/store';
import { TwinTrip } from '../TwinTrip';

/** Глава 2. Парадокс близнецов: Земля, корабль и звезда-цель справа от текста. */
export default function Twins() {
  const beta = useStory((s) => s.twinsBeta);
  const years = useStory((s) => s.twinsYears);
  const launchKey = useStory((s) => s.twinsLaunchKey);
  const chapter = useStory((s) => s.chapter);
  const portrait = useStory((s) => s.portrait);
  const look = CHAPTERS[2].look;

  const onProgress = useCallback((progress: number, earthYears: number, shipYears: number) => {
    const sim = storyStore.getState().twinsSim;
    sim.progress = progress;
    sim.earthYears = earthYears;
    sim.shipYears = shipYears;
  }, []);
  const onDone = useCallback(() => storyStore.getState().finishTwins(), []);

  return (
    <TwinTrip
      beta={beta}
      years={years}
      launchKey={launchKey}
      origin={[look[0] + (portrait ? -7 : 1), look[1] + 1, look[2] + 6]}
      length={portrait ? 12 : 16}
      running={chapter === 2}
      onProgress={onProgress}
      onDone={onDone}
    />
  );
}
