/** GLSL для фона. Без обратных кавычек внутри строк. */

export const starsVert = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uAttenuate;
uniform float uTravel;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float att = mix(1.0, uScale / max(-mv.z, 1.0), uAttenuate);
  float tw = 0.7 + 0.3 * sin(uTime * (0.8 + aPhase * 2.0) + aPhase * 6.2831);
  vTwinkle = tw;
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio * att * (1.0 + uTravel * 0.6);
  gl_Position = projectionMatrix * mv;
}
`;

export const starsFrag = /* glsl */ `
uniform float uIntensity;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = smoothstep(1.0, 0.0, d);
  float a = pow(core, 2.2);
  if (a < 0.01) discard;
  vec3 col = vColor * uIntensity * vTwinkle;
  gl_FragColor = vec4(col * a, a);
}
`;

export const nebulaVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vUv * 3.0;
  float t = uTime * 0.02;
  float n = fbm(p + fbm(p + t) * 1.5 + t);
  float mask = smoothstep(0.5, 0.0, length(vUv - 0.5));
  float a = smoothstep(0.35, 0.85, n) * mask * uAlpha;
  vec3 col = mix(uColorA, uColorB, smoothstep(0.4, 0.9, n));
  gl_FragColor = vec4(col * a, a);
}
`;
