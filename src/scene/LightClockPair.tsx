import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, Mesh } from 'three';
import { gamma } from '../physics/lorentz';

/**
 * Пара световых часов: неподвижные и летящие.
 * Фотон прыгает между зеркалами; у летящих часов в нашей системе отсчёта путь фотона
 * диагональный и длиннее, поэтому они тикают реже: период = γ·T₀.
 *
 * Симуляция ведётся по фазе (p += dt/период), так что смена скорости не рвёт движение.
 * Визуальная «скорость света» c_vis = 2H/T₀, летящие часы едут со скоростью β·c_vis.
 */
export interface LightClockPairProps {
  /** β = v/c летящих часов, 0..0,99 */
  beta: number;
  /** Нижняя середина неподвижных часов */
  origin: [number, number, number];
  /** Левая граница и ширина зоны, по которой летят вторые часы (зацикливаются) */
  trackStart: number;
  trackWidth: number;
  /** Расстояние между зеркалами, в единицах сцены */
  height?: number;
  /** Период неподвижных часов в секундах реального времени */
  period?: number;
  running?: boolean;
  /** Любое изменение сбрасывает счётчики и фазу */
  resetKey?: number;
  /** Вызывается при смене числа тиков */
  onTicks?: (rest: number, moving: number) => void;
}

const TRAIL = 160;

/** Треугольная волна фазы: 0 → 0, 0,5 → 1, 1 → 0 */
function tri(p: number): number {
  const f = p - Math.floor(p);
  return 1 - Math.abs(2 * f - 1);
}

function Clock({ height, mirrorWidth = 2.6, dim = false }: { height: number; mirrorWidth?: number; dim?: boolean }) {
  const mirror = dim ? '#8e9ad1' : '#dfe7ff';
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[mirrorWidth, 0.14, 0.9]} />
        <meshBasicMaterial color={mirror} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[mirrorWidth, 0.14, 0.9]} />
        <meshBasicMaterial color={mirror} />
      </mesh>
      {/* стойки сзади */}
      <mesh position={[-mirrorWidth / 2 + 0.1, height / 2, -0.4]}>
        <boxGeometry args={[0.08, height, 0.08]} />
        <meshBasicMaterial color="#3b4270" />
      </mesh>
      <mesh position={[mirrorWidth / 2 - 0.1, height / 2, -0.4]}>
        <boxGeometry args={[0.08, height, 0.08]} />
        <meshBasicMaterial color="#3b4270" />
      </mesh>
    </group>
  );
}

function Photon({ color }: { color: [number, number, number] }) {
  return (
    <mesh>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

export function LightClockPair({
  beta,
  origin,
  trackStart,
  trackWidth,
  height = 6,
  period = 2,
  running = true,
  resetKey = 0,
  onTicks,
}: LightClockPairProps) {
  const restPhoton = useRef<Mesh>(null);
  const movingPhoton = useRef<Mesh>(null);
  const movingClock = useRef<Group>(null);
  const sim = useRef({ t: 0, pRest: 0, pMov: 0, rest: 0, moving: 0, trailN: 0 });
  const betaRef = useRef(beta);
  betaRef.current = beta;

  // След фотона летящих часов: ломаная в мировых координатах
  const trail = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    geo.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({ color: '#ffb454', transparent: true, opacity: 0.75, blending: AdditiveBlending, toneMapped: false });
    return new Line(geo, mat);
  }, []);
  useEffect(() => () => {
    trail.geometry.dispose();
    (trail.material as LineBasicMaterial).dispose();
  }, [trail]);

  // Сброс
  useEffect(() => {
    const s = sim.current;
    s.t = 0;
    s.pRest = 0;
    s.pMov = 0;
    s.rest = 0;
    s.moving = 0;
    s.trailN = 0;
    trail.geometry.setDrawRange(0, 0);
    onTicks?.(0, 0);
  }, [resetKey, trail, onTicks]);

  useFrame((_, dt) => {
    if (!running) return;
    const s = sim.current;
    const b = betaRef.current;
    const g = gamma(b);
    const d = Math.min(dt, 0.05);
    s.t += d;
    s.pRest += d / period;
    s.pMov += d / (period * g);

    // Неподвижные: фотон по вертикали
    if (restPhoton.current) restPhoton.current.position.y = tri(s.pRest) * height;

    // Летящие: едут вправо и зацикливаются
    const cVis = (2 * height) / period;
    const x = ((b * cVis * s.t) % trackWidth) + trackStart;
    const wrapped = movingClock.current && x < movingClock.current.position.x - 1;
    if (movingClock.current) movingClock.current.position.x = x;
    const y = tri(s.pMov) * height;
    if (movingPhoton.current) movingPhoton.current.position.y = y;

    // След
    const pos = trail.geometry.getAttribute('position') as BufferAttribute;
    if (wrapped) s.trailN = 0;
    const arr = pos.array as Float32Array;
    if (s.trailN >= TRAIL) {
      arr.copyWithin(0, 3, TRAIL * 3);
      s.trailN = TRAIL - 1;
    }
    arr[s.trailN * 3] = x;
    arr[s.trailN * 3 + 1] = origin[1] + y;
    arr[s.trailN * 3 + 2] = origin[2] + 0.2;
    s.trailN++;
    pos.needsUpdate = true;
    trail.geometry.setDrawRange(0, s.trailN);

    const rest = Math.floor(s.pRest);
    const moving = Math.floor(s.pMov);
    if (rest !== s.rest || moving !== s.moving) {
      s.rest = rest;
      s.moving = moving;
      onTicks?.(rest, moving);
    }
  });

  return (
    <group>
      {/* Неподвижные часы */}
      <group position={origin}>
        <Clock height={height} />
        {/* путь фотона: вертикальная линия */}
        <mesh position={[0, height / 2, 0.2]}>
          <boxGeometry args={[0.03, height, 0.03]} />
          <meshBasicMaterial color="#6d5dfc" transparent opacity={0.5} />
        </mesh>
        <group ref={restPhoton} position={[0, 0, 0.2]}>
          <Photon color={[2.4, 2.6, 3.2]} />
        </group>
      </group>

      {/* Летящие часы */}
      <group ref={movingClock} position={[trackStart, origin[1], origin[2]]}>
        <Clock height={height} dim />
        <group ref={movingPhoton} position={[0, 0, 0.2]}>
          <Photon color={[3.2, 2.2, 1.0]} />
        </group>
      </group>
      <primitive object={trail} />
    </group>
  );
}
