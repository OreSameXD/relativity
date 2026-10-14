import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, LineBasicMaterial, LineSegments, Object3D, Vector3 } from 'three';
import { Earth } from './Earth';

/**
 * Земля и группировка спутников GPS: 3 орбитальные плоскости с наклонением 55°,
 * по 4 спутника (в реальности 6 плоскостей и больше 24 спутников — упрощено).
 * От спутников над горизонтом к точке «вы» тянутся лучи сигнала.
 */
export interface GpsConstellationProps {
  center: [number, number, number];
  earthRadius?: number;
  /** Радиус орбиты в радиусах Земли (GPS ≈ 4,17) */
  orbitRatio?: number;
  planes?: number;
  perPlane?: number;
  /** Период обращения в секундах реального времени */
  period?: number;
  running?: boolean;
  /** Лучи красные, если поправка выключена */
  warn?: boolean;
  /** Широта и долгота точки «вы», градусы */
  you?: [number, number];
}

const INCLINATION = (55 * Math.PI) / 180;

function OrbitRing({ radius, raan }: { radius: number; raan: number }) {
  const geo = useMemo(() => {
    const n = 128;
    const pos = new Float32Array(n * 2 * 3);
    const v = new Vector3();
    const o = new Object3D();
    o.rotation.set(0, raan, 0);
    o.rotateX(INCLINATION);
    o.updateMatrix();
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 2; k++) {
        const a = ((i + k) / n) * Math.PI * 2;
        v.set(Math.cos(a) * radius, 0, Math.sin(a) * radius).applyMatrix4(o.matrix);
        pos.set([v.x, v.y, v.z], (i * 2 + k) * 3);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return g;
  }, [radius, raan]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#6d5dfc" transparent opacity={0.28} blending={AdditiveBlending} />
    </lineSegments>
  );
}

function Satellite() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.36, 0.36, 0.5]} />
        <meshBasicMaterial color="#c8d0e6" />
      </mesh>
      <mesh position={[0.75, 0, 0]}>
        <boxGeometry args={[0.9, 0.04, 0.36]} />
        <meshBasicMaterial color="#3250c8" />
      </mesh>
      <mesh position={[-0.75, 0, 0]}>
        <boxGeometry args={[0.9, 0.04, 0.36]} />
        <meshBasicMaterial color="#3250c8" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={[2.6, 2.8, 3.4]} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function GpsConstellation({
  center,
  earthRadius = 3,
  orbitRatio = 4.17,
  planes = 3,
  perPlane = 4,
  period = 40,
  running = true,
  warn = false,
  you = [45, 20],
}: GpsConstellationProps) {
  const earth = useRef<Group>(null);
  const sats = useRef<Group[]>([]);
  const youRef = useRef<Group>(null);
  const orbitR = earthRadius * orbitRatio;
  const count = planes * perPlane;
  const helpers = useMemo(() => ({ o: new Object3D(), v: new Vector3(), yw: new Vector3(), tmp: new Vector3() }), []);

  const rays = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 2 * 3), 3));
    geo.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.55, blending: AdditiveBlending });
    return new LineSegments(geo, mat);
  }, [count]);

  const youLocal = useMemo(() => {
    const lat = (you[0] * Math.PI) / 180;
    const lon = (you[1] * Math.PI) / 180;
    return new Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(earthRadius * 1.01);
  }, [you, earthRadius]);

  const tRef = useRef(0);
  useFrame((_, dt) => {
    if (!running) return;
    tRef.current += dt;
    const t = tRef.current;
    if (earth.current) earth.current.rotation.y = t * 0.08;
    const { o, v, yw, tmp } = helpers;
    // точка «вы» вращается вместе с Землёй
    yw.copy(youLocal).applyAxisAngle(new Vector3(0, 1, 0), t * 0.08).add(new Vector3(...center));
    youRef.current?.position.copy(yw);

    const pos = rays.geometry.getAttribute('position') as BufferAttribute;
    let n = 0;
    for (let p = 0; p < planes; p++) {
      o.rotation.set(0, (p / planes) * Math.PI * 2, 0);
      o.rotateX(INCLINATION);
      o.updateMatrix();
      for (let k = 0; k < perPlane; k++) {
        const i = p * perPlane + k;
        const a = ((k / perPlane) + t / period + p * 0.13) * Math.PI * 2;
        v.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR).applyMatrix4(o.matrix);
        const g = sats.current[i];
        if (g) {
          g.position.set(center[0] + v.x, center[1] + v.y, center[2] + v.z);
          g.lookAt(center[0], center[1], center[2]);
        }
        // над горизонтом точки «вы»? угол между направлением на спутник и местной вертикалью
        tmp.copy(g ? g.position : v).sub(yw);
        const up = tmp.clone().normalize().dot(yw.clone().sub(new Vector3(...center)).normalize());
        if (up > 0.15) {
          pos.set([yw.x, yw.y, yw.z, g!.position.x, g!.position.y, g!.position.z], n * 6);
          n++;
        }
      }
    }
    pos.needsUpdate = true;
    rays.geometry.setDrawRange(0, n * 2);
    (rays.material as LineBasicMaterial).color.set(warn ? '#ff6a4d' : '#9fb4ff');
  });

  return (
    <group>
      <group ref={earth} position={center}>
        <Earth radius={earthRadius} lightDir={[0.6, 0.3, 0.75]} />
      </group>
      <group position={center}>
        {Array.from({ length: planes }, (_, p) => (
          <OrbitRing key={p} radius={orbitR} raan={(p / planes) * Math.PI * 2} />
        ))}
      </group>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => { if (el) sats.current[i] = el; }}>
          <Satellite />
        </group>
      ))}
      <group ref={youRef}>
        <mesh>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshBasicMaterial color={[2.6, 2.0, 1.0]} toneMapped={false} />
        </mesh>
      </group>
      <primitive object={rays} />
    </group>
  );
}
