import { useMemo } from 'react';
import { CHAPTERS } from '../../story/chapters';
import { StarCluster } from '../StarCluster';

/**
 * Глава 4. Сама чёрная дыра — пост-эффект (LensingEffect).
 * Здесь — плотное звёздное скопление позади неё, чтобы линзе было что гнуть.
 */
export default function Lens() {
  const look = CHAPTERS[4].look;
  const center = useMemo<[number, number, number]>(() => [look[0], look[1], look[2]], [look]);
  const spread = useMemo<[number, number, number]>(() => [24, 16, 12], []);
  return <StarCluster center={center} spread={spread} count={3200} sizeMax={6.5} />;
}
