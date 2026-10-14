import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Mesh, ShaderMaterial, Vector3 } from 'three';
import { useStory, type Quality } from '../story/store';

/**
 * Небесный купол: туманности по направлению взгляда. Сфера следует за камерой,
 * поэтому это «бесконечный» фон, а параллакс дают пыль и ближние слои.
 * Шум трёхмерный с доменным искажением, пылевые полосы и полоса Млечного Пути.
 */
const OCTAVES: Record<Quality, number> = { high: 6, medium: 4, low: 3 };

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const frag = (octaves: number) => /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uBand;
varying vec3 vDir;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < ${octaves}; i++) {
    v += a * noise3(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 q = d * 2.3;
  // доменное искажение: клочья и волокна вместо ровных пятен
  vec3 warp = vec3(fbm(q + vec3(1.7, 9.2, 3.3)), fbm(q + vec3(8.3, 2.8, 5.1)), fbm(q + vec3(4.1, 6.4, 1.9)));
  float n = fbm(q + 1.7 * warp + uTime * 0.003);
  float lanes = fbm(q * 3.3 + vec3(5.0, 1.0, 2.0));
  // полоса Млечного Пути: ярче у большого круга, перпендикулярного uBand
  float band = exp(-pow(dot(d, uBand) * 2.6, 2.0));
  float density = smoothstep(0.46, 0.86, n) * (0.25 + 0.75 * band);
  density *= 1.0 - 0.65 * smoothstep(0.52, 0.70, lanes);

  vec3 deep = vec3(0.035, 0.05, 0.19);
  vec3 violet = vec3(0.26, 0.19, 0.62);
  vec3 magenta = vec3(0.60, 0.30, 0.66);
  vec3 warm = vec3(0.90, 0.48, 0.22);
  vec3 col = mix(deep, violet, smoothstep(0.30, 0.70, n));
  col = mix(col, magenta, smoothstep(0.66, 0.92, n));
  float warmMask = smoothstep(0.58, 0.80, fbm(d * 1.4 + vec3(20.0, 3.0, 7.0)));
  col = mix(col, warm, warmMask * 0.55);

  // мелкие яркие зёрна в плотных местах: намёк на неразрешённые звёзды
  float grain = pow(noise3(d * 160.0), 34.0) * density * 1.2;

  vec3 outCol = col * density * uIntensity + vec3(0.9, 0.92, 1.0) * grain + vec3(0.008, 0.010, 0.024);
  gl_FragColor = vec4(outCol, 1.0);
}
`;

export function Skydome() {
  const quality = useStory((s) => s.quality);
  const mesh = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag(OCTAVES[quality]),
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0.6 }, uBand: { value: new Vector3(0.35, 0.9, 0.25).normalize() } },
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [quality],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.current?.position.copy(state.camera.position);
  });
  return <mesh ref={mesh} material={mat} renderOrder={-10} frustumCulled={false}>
    <sphereGeometry args={[700, 48, 32]} />
  </mesh>;
}
