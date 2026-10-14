import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, Vector3 } from 'three';
import { CHAPTERS } from '../../story/chapters';
import { starsFrag, starsVert } from '../shaders';

/**
 * Глава 4. Сама чёрная дыра — пост-эффект (LensingEffect).
 * Здесь — плотное звёздное скопление позади неё, чтобы линзе было что гнуть.
 */
export default function Lens() {
  const dpr = useThree((s) => s.viewport.dpr);
  const look = CHAPTERS[4].look;
  const geo = useMemo(() => {
    const count = 2200;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const c = new Color();
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      // скопление: гауссово облако
      const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
      v.set(look[0] + g() * 24, look[1] + g() * 16, look[2] + g() * 12);
      pos.set([v.x, v.y, v.z], i * 3);
      const s = Math.pow(Math.random(), 2.5);
      size[i] = 1.2 + s * 4.5;
      phase[i] = Math.random();
      const r = Math.random();
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
  }, [look]);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVert,
        fragmentShader: starsFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: dpr },
          uScale: { value: 90 },
          uAttenuate: { value: 1 },
          uTravel: { value: 0 },
          uIntensity: { value: 1.1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [dpr],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
