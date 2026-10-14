import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3 } from 'three';
import { useCameraCurve } from './CameraRig';
import { storyStore, useStory, type Quality } from '../story/store';
import { nebulaFrag, nebulaVert, starsFrag, starsVert } from './shaders';
import { Skydome } from './Skydome';

const COUNTS: Record<Quality, { far: number; faint: number; dust: number }> = {
  high: { far: 6000, faint: 9000, dust: 2200 },
  medium: { far: 2600, faint: 3500, dust: 900 },
  low: { far: 1200, faint: 1200, dust: 350 },
};

/** Цвет звезды: холодные белые и голубые, редкие тёплые. */
function starColor(r: number, out: Color) {
  if (r < 0.08) out.set('#ffb454');
  else if (r < 0.45) out.set('#e9f1ff');
  else if (r < 0.8) out.set('#9fb4ff');
  else out.set('#c7a8ff');
}

export function makeStars(count: number, place: (i: number, v: Vector3) => void, sizeMin: number, sizeMax: number) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const v = new Vector3();
  const c = new Color();
  for (let i = 0; i < count; i++) {
    place(i, v);
    pos.set([v.x, v.y, v.z], i * 3);
    const s = Math.pow(Math.random(), 3);
    size[i] = sizeMin + s * (sizeMax - sizeMin);
    phase[i] = Math.random();
    starColor(Math.random(), c);
    const bright = s > 0.85 ? 2.6 : 1.0;
    color.set([c.r * bright, c.g * bright, c.b * bright], i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aSize', new Float32BufferAttribute(size, 1));
  g.setAttribute('aPhase', new Float32BufferAttribute(phase, 1));
  g.setAttribute('aColor', new Float32BufferAttribute(color, 3));
  return g;
}

export function starMaterial(attenuate: number, scale: number, intensity: number, dpr: number) {
  return new ShaderMaterial({
    vertexShader: starsVert,
    fragmentShader: starsFrag,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uScale: { value: scale },
      uAttenuate: { value: attenuate },
      uTravel: { value: 0 },
      uIntensity: { value: intensity },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Далёкие звёзды: сфера вокруг камеры, как бы на бесконечности. */
function FarStars({ count, sizeMin = 1.0, sizeMax = 3.4, intensity = 1.0, seedShift = 0 }: { count: number; sizeMin?: number; sizeMax?: number; intensity?: number; seedShift?: number }) {
  const ref = useRef<Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const geo = useMemo(
    () =>
      makeStars(
        count,
        (_, v) => {
          const u = Math.random() * 2 - 1;
          const th = Math.random() * Math.PI * 2;
          const r = Math.sqrt(1 - u * u);
          v.set(r * Math.cos(th) * (600 + seedShift), u * (600 + seedShift), r * Math.sin(th) * (600 + seedShift));
        },
        sizeMin,
        sizeMax,
      ),
    [count, sizeMin, sizeMax, seedShift],
  );
  const mat = useMemo(() => starMaterial(0, 1, intensity, dpr), [dpr, intensity]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.copy(state.camera.position);
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/** Пыль вдоль дороги камеры: параллакс и ощущение скорости. */
function Dust({ count }: { count: number }) {
  const curve = useCameraCurve();
  const dpr = useThree((s) => s.viewport.dpr);
  const geo = useMemo(
    () =>
      makeStars(
        count,
        (_, v) => {
          const p = curve.getPoint(Math.random());
          const a = Math.random() * Math.PI * 2;
          const r = 4 + Math.random() * 30;
          v.set(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + (Math.random() - 0.5) * 30);
        },
        0.6,
        2.4,
      ),
    [count, curve],
  );
  const mat = useMemo(() => starMaterial(1, 60, 0.9, dpr), [dpr]);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uTravel.value = storyStore.getState().cam.travel;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

interface NebulaProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: number;
  a: string;
  b: string;
  alpha?: number;
}

function Nebula({ position, rotation = [0, 0, 0], size, a, b, alpha = 0.55 }: NebulaProps) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new Color(a) },
          uColorB: { value: new Color(b) },
          uAlpha: { value: alpha },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [a, b, alpha],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

export function Background() {
  const quality = useStory((s) => s.quality);
  const n = COUNTS[quality];
  return (
    <group>
      <Skydome />
      {/* два слоя звёзд: яркие с ореолами и россыпь мелких */}
      <FarStars count={n.far} />
      <FarStars count={n.faint} sizeMin={0.5} sizeMax={1.3} intensity={0.6} seedShift={20} />
      <Dust count={n.dust} />
      {/* ближние клочья для параллакса: за чёрной дырой и у середины дороги */}
      <Nebula position={[-30, 10, -140]} size={220} a="#0b0f2a" b="#6d5dfc" alpha={0.28} />
      <Nebula position={[10, 0, -300]} size={300} a="#141a4a" b="#8a6dff" alpha={0.4} />
    </group>
  );
}
