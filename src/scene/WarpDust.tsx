import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, LineSegments, ShaderMaterial } from 'three';
import { CHAPTERS } from '../story/chapters';
import { storyStore, useStory, type Quality } from '../story/store';

/**
 * Космическая пыль, ведущая от главы к главе.
 * Частицы живут в системе камеры: в удержании медленно плывут навстречу,
 * в перелёте разгоняются и вытягиваются в штрихи. Цвет плавно переходит
 * от цвета покинутой главы к цвету следующей.
 */
const COUNTS: Record<Quality, number> = { high: 900, medium: 450, low: 200 };
const DEPTH = 60; // глубина зоны перед камерой
const RADIUS = 16;

const vert = /* glsl */ `
attribute float aEnd;
attribute float aSeed;
uniform float uStretch;
uniform float uSize;
varying float vEnd;
varying float vSeed;
void main() {
  vec3 p = position;
  // второй конец штриха отодвигаем назад по оси движения (камера летит в -z)
  p.z += aEnd * uStretch * (0.6 + 0.4 * aSeed);
  vEnd = aEnd;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const frag = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying float vEnd;
varying float vSeed;
void main() {
  float a = (1.0 - vEnd) * uAlpha * (0.5 + 0.5 * vSeed);
  gl_FragColor = vec4(uColor * (1.0 + 0.8 * vSeed), a);
}
`;

export function WarpDust() {
  const quality = useStory((s) => s.quality);
  const count = COUNTS[quality];
  const group = useRef<Group>(null);
  const color = useMemo(() => new Color(), []);
  const from = useMemo(() => new Color(), []);
  const to = useMemo(() => new Color(), []);

  const { geo, mat, data } = useMemo(() => {
    // каждая частица — отрезок из двух вершин: голова (aEnd = 0) и хвост (aEnd = 1)
    const pos = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    const seed = new Float32Array(count * 2);
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * RADIUS;
      data[i * 3] = Math.cos(a) * r;
      data[i * 3 + 1] = Math.sin(a) * r * 0.7;
      data[i * 3 + 2] = -Math.random() * DEPTH;
      const s = Math.random();
      end[i * 2] = 0;
      end[i * 2 + 1] = 1;
      seed[i * 2] = s;
      seed[i * 2 + 1] = s;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aEnd', new BufferAttribute(end, 1));
    geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
    const mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uColor: { value: new Color('#9fb4ff') }, uAlpha: { value: 0.35 }, uStretch: { value: 0.3 }, uSize: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geo, mat, data };
  }, [count]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const { cam, chapter, reducedMotion } = storyStore.getState();
    // система пыли следует за камерой
    g.position.copy(state.camera.position);
    g.quaternion.copy(state.camera.quaternion);

    const travel = reducedMotion ? 0 : cam.travel;
    const speed = 2.5 + travel * 70;
    const d = Math.min(dt, 0.05);
    const pos = geo.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let z = data[i * 3 + 2] + speed * d;
      if (z > 4) z -= DEPTH;
      data[i * 3 + 2] = z;
      const x = data[i * 3];
      const y = data[i * 3 + 1];
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y;
      arr[i * 6 + 5] = z;
    }
    pos.needsUpdate = true;

    // цвет: от главы, которую покидаем, к той, куда летим
    const toDef = CHAPTERS[chapter] ?? CHAPTERS[0];
    const fromDef = CHAPTERS[Math.max(0, chapter - 1)];
    from.set(fromDef.color);
    to.set(toDef.color);
    color.copy(from).lerp(to, Math.min(1, Math.max(0, cam.phase)));
    (mat.uniforms.uColor.value as Color).copy(color);
    mat.uniforms.uStretch.value = 0.25 + travel * 3.5;
    mat.uniforms.uAlpha.value = 0.2 + travel * 0.4;
  });

  return (
    <group ref={group}>
      <primitive object={new LineSegments(geo, mat)} frustumCulled={false} />
    </group>
  );
}
