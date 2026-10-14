import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, ShaderMaterial, Vector3 } from 'three';
import { gamma } from '../physics/lorentz';

/**
 * Полёт близнеца туда-обратно: Земля, корабль, звезда-цель.
 * Анимация занимает DURATION секунд реального времени независимо от выбранных лет.
 * Возраст: Земля — T·p, корабль — T·p/γ. Разворот мгновенный (упрощено).
 */
export interface TwinTripProps {
  beta: number;
  /** Длительность полёта по часам Земли, лет */
  years: number;
  /** Любое изменение запускает полёт заново */
  launchKey: number;
  /** Положение Земли */
  origin: [number, number, number];
  /** Расстояние до звезды в единицах сцены */
  length?: number;
  running?: boolean;
  /** Вызывается каждый кадр во время полёта */
  onProgress?: (progress: number, earthYears: number, shipYears: number) => void;
  onDone?: () => void;
}

const DURATION = 7;
const TRAIL = 240;

const earthVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const earthFrag = /* glsl */ `
uniform vec3 uLightDir;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.1 + 3.7; a *= 0.5; } return v; }
void main() {
  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(uLightDir));
  float day = smoothstep(-0.15, 0.35, ndl);
  // суша и океан из шума, облака сверху
  float land = smoothstep(0.52, 0.6, fbm(vUv * vec2(6.0, 3.0) + 2.0));
  float clouds = smoothstep(0.55, 0.75, fbm(vUv * vec2(9.0, 4.5) + uTime * 0.01));
  vec3 ocean = vec3(0.07, 0.25, 0.62);
  vec3 ground = vec3(0.18, 0.42, 0.22);
  vec3 col = mix(ocean, ground, land);
  col = mix(col, vec3(0.9), clouds * 0.7);
  vec3 night = vec3(0.01, 0.02, 0.06) + vec3(0.35, 0.25, 0.08) * land * 0.25;
  col = mix(night, col, day);
  // ободок атмосферы
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += vec3(0.35, 0.55, 1.0) * rim * (0.35 + 0.65 * day);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function Earth({ lightDir }: { lightDir: [number, number, number] }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        uniforms: { uLightDir: { value: new Vector3(...lightDir) }, uTime: { value: 0 } },
      }),
    [lightDir],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <group>
      <mesh material={mat}>
        <sphereGeometry args={[1.8, 48, 48]} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#6aa8ff" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Star() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial color={[3.2, 2.4, 1.3]} toneMapped={false} />
      </mesh>
      <mesh scale={2.6}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color="#ffb454" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Ship() {
  return (
    <group>
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.28, 0.9, 12]} />
        <meshStandardMaterial color="#dfe7ff" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* выхлоп: яркая точка для bloom */}
      <mesh position={[-0.55, 0, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color={[2.8, 2.2, 3.6]} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function TwinTrip({ beta, years, launchKey, origin, length = 16, running = true, onProgress, onDone }: TwinTripProps) {
  const ship = useRef<Group>(null);
  const earth = useRef<Group>(null);
  const sim = useRef({ t: -1, done: true, trailN: 0 });
  const params = useRef({ beta, years });
  params.current = { beta, years };

  const lightDir = useMemo<[number, number, number]>(() => [0.55, 0.35, 0.75], []);
  const trail = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    geo.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.6, blending: AdditiveBlending, toneMapped: false });
    return new Line(geo, mat);
  }, []);
  useEffect(() => () => {
    trail.geometry.dispose();
    (trail.material as LineBasicMaterial).dispose();
  }, [trail]);

  // Запуск полёта
  useEffect(() => {
    if (launchKey === 0) return;
    const s = sim.current;
    s.t = 0;
    s.done = false;
    s.trailN = 0;
    trail.geometry.setDrawRange(0, 0);
  }, [launchKey, trail]);

  useFrame((state, dt) => {
    if (earth.current) earth.current.rotation.y += dt * 0.15;
    if (!running) return;
    const s = sim.current;
    if (s.done) return;

    s.t += Math.min(dt, 0.05);
    const p = Math.min(1, s.t / DURATION);
    // плавный разгон и торможение в каждой половине: ease in-out на отрезках [0, 0.5] и [0.5, 1]
    const half = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    const eased = half * half * (3 - 2 * half);
    const along = p < 0.5 ? eased : 1 - eased;
    const x = origin[0] + along * length;
    const y = origin[1] + Math.sin(Math.PI * along) * (p < 0.5 ? 1.6 : -1.6);
    if (ship.current) {
      ship.current.position.set(x, y, origin[2]);
      ship.current.rotation.z = p < 0.5 ? 0 : Math.PI;
    }

    const pos = trail.geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    if (s.trailN >= TRAIL) {
      arr.copyWithin(0, 3, TRAIL * 3);
      s.trailN = TRAIL - 1;
    }
    arr[s.trailN * 3] = x;
    arr[s.trailN * 3 + 1] = y;
    arr[s.trailN * 3 + 2] = origin[2] - 0.2;
    s.trailN++;
    pos.needsUpdate = true;
    trail.geometry.setDrawRange(0, s.trailN);

    const { beta: b, years: T } = params.current;
    onProgress?.(p, T * p, (T * p) / gamma(b));

    if (p >= 1) {
      s.done = true;
      onDone?.();
    }
  });

  return (
    <group>
      <ambientLight intensity={0.35} />
      <directionalLight position={[origin[0] + 20, origin[1] + 10, origin[2] + 14]} intensity={2.2} />
      <group ref={earth} position={origin}>
        <Earth lightDir={lightDir} />
      </group>
      <group position={[origin[0] + length, origin[1], origin[2]]}>
        <Star />
      </group>
      {/* пунктирная дорога */}
      <mesh position={[origin[0] + length / 2, origin[1], origin[2] - 0.3]}>
        <boxGeometry args={[length, 0.02, 0.02]} />
        <meshBasicMaterial color="#3b4270" />
      </mesh>
      <group ref={ship} position={[origin[0], origin[1], origin[2]]} scale={1.5}>
        <Ship />
      </group>
      <primitive object={trail} />
    </group>
  );
}
