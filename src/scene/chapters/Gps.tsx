import { CHAPTERS } from '../../story/chapters';
import { useStory } from '../../story/store';
import { GpsConstellation } from '../GpsConstellation';

/** Глава 5. Земля со спутниками GPS справа от текста; лучи краснеют, когда поправка выключена. */
export default function Gps() {
  const chapter = useStory((s) => s.chapter);
  const correction = useStory((s) => s.gpsCorrection);
  const look = CHAPTERS[5].look;
  return <GpsConstellation center={[look[0] + 6, look[1] - 1, look[2]]} earthRadius={3} running={chapter === 5} warn={!correction} />;
}
