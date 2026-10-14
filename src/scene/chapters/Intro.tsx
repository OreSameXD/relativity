import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, Mesh, ShaderMaterial } from 'three';
import { storyStore } from '../../story/store';

/** Интро: мягкое ядро света далеко впереди — точка, к которой летит камера. */
const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const frag = /* glsl */ `
uniform float uTime;
uniform float uFade;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  // Мягкий широкий свет без жёсткого ядра: ниже порога bloom, просто подсвечивает фон
  float core = exp(-d * d * 7.0) * (0.42 + 0.05 * sin(uTime * 0.6));
  float glow = exp(-d * 2.2) * 0.22;
  vec3 col = vec3(0.8, 0.86, 1.0) * core + vec3(0.5, 0.45, 1.0) * glow;
  float a = smoothstep(1.0, 0.0, d) * uFade;
  gl_FragColor = vec4(col * a, a);
}
`;

export default function Intro() {
  const mesh = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    // Гаснет, как только камера трогается к главе 1
    const t = storyStore.getState().cam.t;
    mat.uniforms.uFade.value = 1 - MathUtils.smoothstep(t, 0.0, 0.08);
    mesh.current?.lookAt(state.camera.position);
  });
  return (
    <mesh ref={mesh} position={[12, 4, -150]} material={mat}>
      <planeGeometry args={[110, 110]} />
    </mesh>
  );
}
