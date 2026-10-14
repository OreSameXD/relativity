import { useMemo } from 'react';
import { CHAPTERS } from '../../story/chapters';
import { useStory } from '../../story/store';
import { StarCluster } from '../StarCluster';

/**
 * Глава 4. Сама чёрная дыра — пост-эффект (LensingEffect).
 * Здесь — плотное звёздное скопление позади неё, чтобы линзе было что гнуть.
 */
export default function Lens() {
  const look = CHAPTERS[4].look;
  const quality = useStory((s) => s.quality);
  const count = quality === 'high' ? 3200 : quality === 'medium' ? 1800 : 900;
  const center = useMemo<[number, number, number]>(() => [look[0], look[1], look[2]], [look]);
  const spread = useMemo<[number, number, number]>(() => [24, 16, 12], []);
  return <StarCluster center={center} spread={spread} count={count} sizeMax={6.5} />;
}
