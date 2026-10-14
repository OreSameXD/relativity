import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';
import { CHAPTERS } from '../../story/chapters';
import { useCameraCurve } from '../CameraRig';

/**
 * Финал. Камера поднялась и смотрит назад: видна вся «дорога» глав —
 * линия полёта камеры и тёплые огни там, где были главы.
 */
export default function Finale() {
  const curve = useCameraCurve();
  const lights = useRef<Group>(null);

  const road = useMemo(() => {
    const n = 240;
    const pos = new Float32Array(n * 3);
    const v = new Vector3();
    for (let i = 0; i < n; i++) {
      curve.getPoint(i / (n - 1), v);
      pos.set([v.x, v.y - 1.5, v.z], i * 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const mat = new LineBasicMaterial({ color: '#6d5dfc', transparent: true, opacity: 0.35, blending: AdditiveBlending });
    return new Line(geo, mat);
  }, [curve]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lights.current?.children.forEach((g, i) => {
      const s = 1 + 0.18 * Math.sin(t * 1.3 + i * 1.7);
      g.scale.setScalar(s);
    });
  });

  return (
    <group>
      <primitive object={road} />
      <group ref={lights}>
        {CHAPTERS.slice(1, 6).map((c) => (
          <group key={c.id} position={[c.look[0], c.look[1], c.look[2]]}>
            <mesh>
              <sphereGeometry args={[0.9, 16, 16]} />
              <meshBasicMaterial color={[2.4, 1.8, 1.0]} toneMapped={false} />
            </mesh>
            <mesh scale={4}>
              <sphereGeometry args={[0.9, 12, 12]} />
              <meshBasicMaterial color="#ffb454" transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
