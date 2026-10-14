import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, ShaderMaterial, Vector3 } from 'three';

/** Земля с процедурной поверхностью: океан, суша, облака, терминатор и ободок атмосферы. */
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
  float land = smoothstep(0.52, 0.6, fbm(vUv * vec2(6.0, 3.0) + 2.0));
  float clouds = smoothstep(0.55, 0.75, fbm(vUv * vec2(9.0, 4.5) + uTime * 0.01));
  vec3 ocean = vec3(0.07, 0.25, 0.62);
  vec3 ground = vec3(0.18, 0.42, 0.22);
  vec3 col = mix(ocean, ground, land);
  col = mix(col, vec3(0.9), clouds * 0.7);
  vec3 night = vec3(0.01, 0.02, 0.06) + vec3(0.35, 0.25, 0.08) * land * 0.25;
  col = mix(night, col, day);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += vec3(0.35, 0.55, 1.0) * rim * (0.35 + 0.65 * day);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function Earth({ radius = 1.8, lightDir = [0.55, 0.35, 0.75] as [number, number, number] }: { radius?: number; lightDir?: [number, number, number] }) {
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
        <sphereGeometry args={[radius, 48, 48]} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#6aa8ff" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
