import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, Vector3 } from 'three';
import { starsFrag, starsVert } from './shaders';

interface Props {
  center: [number, number, number];
  /** Полуразмеры гауссова облака по осям */
  spread: [number, number, number];
  count?: number;
  /** Масштаб перспективного уменьшения точек */
  scale?: number;
  intensity?: number;
  sizeMin?: number;
  sizeMax?: number;
  seed?: number;
}

/** Детерминированный генератор: одинаковое скопление при каждом рендере. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Плотное звёздное скопление (гауссово облако) — фон для линзы. */
export function StarCluster({ center, spread, count = 2200, scale = 90, intensity = 1.1, sizeMin = 1.2, sizeMax = 5.7, seed = 7 }: Props) {
  const dpr = useThree((s) => s.viewport.dpr);

  const geo = useMemo(() => {
    const rnd = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const c = new Color();
    const v = new Vector3();
    const g = () => (rnd() + rnd() + rnd() - 1.5) * 2;
    for (let i = 0; i < count; i++) {
      v.set(center[0] + g() * spread[0], center[1] + g() * spread[1], center[2] + g() * spread[2]);
      pos.set([v.x, v.y, v.z], i * 3);
      const s = Math.pow(rnd(), 2.5);
      size[i] = sizeMin + s * (sizeMax - sizeMin);
      phase[i] = rnd();
      const r = rnd();
      c.set(r < 0.1 ? '#ffb454' : r < 0.6 ? '#e9f1ff' : '#a8bbff');
      const bright = s > 0.8 ? 3.0 : 1.3;
      color.set([c.r * bright, c.g * bright, c.b * bright], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geometry.setAttribute('aSize', new Float32BufferAttribute(size, 1));
    geometry.setAttribute('aPhase', new Float32BufferAttribute(phase, 1));
    geometry.setAttribute('aColor', new Float32BufferAttribute(color, 3));
    return geometry;
  }, [center, spread, count, sizeMin, sizeMax, seed]);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVert,
        fragmentShader: starsFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: dpr },
          uScale: { value: scale },
          uAttenuate: { value: 1 },
          uTravel: { value: 0 },
          uIntensity: { value: intensity },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [dpr, scale, intensity],
  );

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
