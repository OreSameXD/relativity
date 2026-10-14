import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Group, InstancedMesh, Object3D, ShaderMaterial, Vector2, Vector3 } from 'three';

/**
 * Сетка «пространства-времени»: плоскость, которую прогибают массы (упрощено:
 * это наглядная воронка h = −Σ s/√(d²+ε²), а не параболоид Фламма).
 * Планеты — пробные тела, движутся в ньютоновском поле масс и «катятся» по поверхности.
 */
export type MassKind = 'star' | 'hole';
export interface GridMass {
  x: number;
  z: number;
  kind: MassKind;
}

export interface SpacetimeGridProps {
  center: [number, number, number];
  width?: number;
  depth?: number;
  segments?: number;
  masses: GridMass[];
  planets?: number;
  running?: boolean;
  /** Клик по сетке: координаты в мировой системе */
  onPlace?: (x: number, z: number) => void;
}

const MAX_MASSES = 8;
const EPS = 2.6;
const STRENGTH: Record<MassKind, number> = { star: 14, hole: 38 };
const CAPTURE: Record<MassKind, number> = { star: 1.4, hole: 1.1 };
const G_VIS = 22;

const gridVert = /* glsl */ `
uniform int uCount;
uniform vec2 uMass[${MAX_MASSES}];
uniform float uStrength[${MAX_MASSES}];
uniform float uEps;
varying vec3 vWorld;
varying float vDepth;
float wellHeight(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_MASSES}; i++) {
    if (i >= uCount) break;
    vec2 d = p - uMass[i];
    h -= uStrength[i] / sqrt(dot(d, d) + uEps * uEps);
  }
  return h;
}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = wellHeight(wp.xz);
  wp.y += h;
  vWorld = wp.xyz;
  vDepth = -h;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const gridFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform float uCell;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec2 c = vWorld.xz / uCell;
  vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float depthGlow = smoothstep(0.0, 10.0, vDepth);
  vec3 col = mix(uColor, uGlow, depthGlow);
  float a = line * (0.55 + 0.45 * depthGlow);
  // лёгкая заливка ячеек, чтобы плоскость читалась
  a += 0.035;
  gl_FragColor = vec4(col * a, a);
}
`;

interface Planet {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

function wellHeightJs(x: number, z: number, masses: GridMass[]): number {
  let h = 0;
  for (const m of masses) {
    const dx = x - m.x;
    const dz = z - m.z;
    h -= STRENGTH[m.kind] / Math.sqrt(dx * dx + dz * dz + EPS * EPS);
  }
  return h;
}

export function SpacetimeGrid({ center, width = 60, depth = 44, segments = 150, masses, planets = 8, running = true, onPlace }: SpacetimeGridProps) {
  const massesRef = useRef(masses);
  massesRef.current = masses;
  const planetMesh = useRef<InstancedMesh>(null);
  const markers = useRef<Group>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: gridVert,
        fragmentShader: gridFrag,
        uniforms: {
          uCount: { value: 0 },
          uMass: { value: Array.from({ length: MAX_MASSES }, () => new Vector2()) },
          uStrength: { value: new Array(MAX_MASSES).fill(0) },
          uEps: { value: EPS },
          uColor: { value: new Vector3(0.42, 0.37, 0.98) },
          uGlow: { value: new Vector3(1.0, 0.72, 0.35) },
          uCell: { value: 2 },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    [],
  );

  // Массы → uniforms
  useEffect(() => {
    mat.uniforms.uCount.value = Math.min(masses.length, MAX_MASSES);
    masses.slice(0, MAX_MASSES).forEach((m, i) => {
      (mat.uniforms.uMass.value as Vector2[])[i].set(m.x, m.z);
      (mat.uniforms.uStrength.value as number[])[i] = STRENGTH[m.kind];
    });
  }, [masses, mat]);

  // Планеты
  const sim = useRef<Planet[]>([]);
  const bounds = useMemo(() => ({ x0: center[0] - width / 2, x1: center[0] + width / 2, z0: center[2] - depth / 2, z1: center[2] + depth / 2 }), [center, width, depth]);

  const spawn = (p: Planet) => {
    // старт на краю, скорость направлена внутрь под углом: без масс — прямая, с массами — орбита или пролёт
    const side = Math.floor(Math.random() * 4);
    const t = Math.random();
    if (side === 0) { p.x = bounds.x0; p.z = bounds.z0 + t * depth; }
    else if (side === 1) { p.x = bounds.x1; p.z = bounds.z0 + t * depth; }
    else if (side === 2) { p.x = bounds.x0 + t * width; p.z = bounds.z0; }
    else { p.x = bounds.x0 + t * width; p.z = bounds.z1; }
    const tx = center[0] + (Math.random() - 0.5) * width * 0.6 - p.x;
    const tz = center[2] + (Math.random() - 0.5) * depth * 0.6 - p.z;
    const len = Math.hypot(tx, tz) || 1;
    const speed = 5 + Math.random() * 4;
    p.vx = (tx / len) * speed;
    p.vz = (tz / len) * speed;
  };

  useEffect(() => {
    sim.current = Array.from({ length: planets }, () => {
      const p = { x: 0, z: 0, vx: 0, vz: 0 };
      spawn(p);
      // первые планеты раскидываем по полю, чтобы не ждать
      p.x = bounds.x0 + Math.random() * width;
      p.z = bounds.z0 + Math.random() * depth;
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets, bounds]);

  useFrame((_, dt) => {
    if (!running) return;
    const ms = massesRef.current;
    const mesh = planetMesh.current;
    if (!mesh) return;
    const step = Math.min(dt, 1 / 30) / 2;
    for (let k = 0; k < 2; k++) {
      for (const p of sim.current) {
        let ax = 0;
        let az = 0;
        let captured = false;
        for (const m of ms) {
          const dx = p.x - m.x;
          const dz = p.z - m.z;
          const d2 = dx * dx + dz * dz + EPS * EPS;
          const inv = (G_VIS * STRENGTH[m.kind]) / (d2 * Math.sqrt(d2));
          ax -= dx * inv;
          az -= dz * inv;
          if (Math.sqrt(dx * dx + dz * dz) < CAPTURE[m.kind]) captured = true;
        }
        p.vx += ax * step;
        p.vz += az * step;
        p.x += p.vx * step;
        p.z += p.vz * step;
        if (captured || p.x < bounds.x0 - 2 || p.x > bounds.x1 + 2 || p.z < bounds.z0 - 2 || p.z > bounds.z1 + 2) spawn(p);
      }
    }
    sim.current.forEach((p, i) => {
      const y = center[1] + wellHeightJs(p.x, p.z, ms) + 0.3;
      dummy.position.set(p.x, y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    // маркеры масс сидят в своих ямах
    markers.current?.children.forEach((g, i) => {
      const m = ms[i];
      if (m) g.position.y = center[1] + wellHeightJs(m.x, m.z, ms) + 0.9;
    });
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPlace) return;
    // Клики по панелям, кнопкам и ссылкам поверх сцены массой не считаются
    const target = e.nativeEvent.target as Element | null;
    if (target?.closest?.('.panel, .lab-controls, a, button, input, label')) return;
    e.stopPropagation();
    onPlace(e.point.x, e.point.z);
  };

  return (
    <group>
      <mesh position={center} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
        <planeGeometry args={[width, depth, segments, Math.round((segments * depth) / width)]} />
      </mesh>
      {/* невидимая плоскость для клика (на уровне невозмущённой сетки) */}
      {onPlace && (
        <mesh position={center} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <instancedMesh ref={planetMesh} args={[undefined, undefined, planets]} frustumCulled={false}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshBasicMaterial color={[1.6, 1.9, 2.6]} toneMapped={false} />
      </instancedMesh>
      <group ref={markers}>
        {masses.map((m, i) => (
          <group key={i} position={[m.x, center[1] + 0.9, m.z]}>
            {m.kind === 'star' ? (
              <>
                <mesh>
                  <sphereGeometry args={[0.9, 24, 24]} />
                  <meshBasicMaterial color={[3.0, 2.2, 1.1]} toneMapped={false} />
                </mesh>
                <mesh scale={2.2}>
                  <sphereGeometry args={[0.9, 16, 16]} />
                  <meshBasicMaterial color="#ffb454" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
                </mesh>
              </>
            ) : (
              <>
                <mesh>
                  <sphereGeometry args={[0.9, 24, 24]} />
                  <meshBasicMaterial color="#000000" />
                </mesh>
                <mesh rotation={[Math.PI / 2.4, 0, 0]}>
                  <torusGeometry args={[1.25, 0.06, 8, 48]} />
                  <meshBasicMaterial color={[2.4, 1.9, 1.3]} toneMapped={false} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
