import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CHAPTERS } from '../story/chapters';
import { storyStore } from '../story/store';

export const BASE_FOV = 55;
export const TRAVEL_FOV = 9;

/** Кривая полёта камеры: проходит через якорь главы N при t = N/(глав-1). */
export function useCameraCurve() {
  return useMemo(
    () => new CatmullRomCurve3(CHAPTERS.map((c) => new Vector3(...c.anchor)), false, 'centripetal'),
    [],
  );
}

export function CameraRig() {
  const curve = useCameraCurve();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as { __scene: unknown; __r3f: unknown };
      w.__scene = scene;
      w.__r3f = get;
    }
  }, [scene, get]);
  const pointer = useRef({ x: 0, y: 0 });
  const pos = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(0, 0, -60), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const parallax = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, dt) => {
    const { cam, reducedMotion, portrait } = storyStore.getState();
    const t = state.clock.elapsedTime;
    curve.getPoint(MathUtils.clamp(cam.t, 0, 1), pos);

    if (!reducedMotion) {
      pos.x += Math.sin(t * 0.37) * 0.25;
      pos.y += Math.sin(t * 0.29 + 1.3) * 0.2;
      parallax.set(pointer.current.x * 0.9, pointer.current.y * 0.5, 0);
    } else {
      parallax.set(0, 0, 0);
    }

    const k = 1 - Math.exp(-dt * 6);
    camera.position.lerp(pos, k);
    // На телефоне сцена должна быть в верхней трети кадра, над текстом: смотрим чуть ниже цели
    lookTarget.set(cam.look.x, cam.look.y - (portrait ? 13 : 0), cam.look.z).add(parallax.clone().multiplyScalar(3));
    look.lerp(lookTarget, k);
    camera.lookAt(look);

    const fov = (portrait ? 74 : BASE_FOV) + cam.travel * TRAVEL_FOV;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
