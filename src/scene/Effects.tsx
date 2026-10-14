import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, EffectGroup, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect, type EffectComposer as EffectComposerImpl } from 'postprocessing';
import { Vector3 } from 'three';
import { storyStore, useStory } from '../story/store';
import { LensingEffect } from './effects/LensingEffect';

function Lensing() {
  const effect = useMemo(
    () =>
      new LensingEffect((out) => {
        const s = storyStore.getState();
        out.x = s.lens.x;
        out.y = s.lens.y;
        out.strength = s.lens.strength;
        out.radius = 0.08 + s.lensMass * 0.2;
        return out;
      }),
    [],
  );
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __lens: LensingEffect }).__lens = effect;
    return () => effect.dispose();
  }, [effect]);
  return <primitive object={effect} dispose={null} />;
}

/** DoF: фокус держится на цели взгляда текущей главы. */
function Dof() {
  const ref = useRef<DepthOfFieldEffect>(null);
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const e = ref.current;
    if (!e) return;
    const { cam } = storyStore.getState();
    look.set(cam.look.x, cam.look.y, cam.look.z);
    const dist = camera.position.distanceTo(look);
    e.cocMaterial.worldFocusDistance = dist;
    e.cocMaterial.worldFocusRange = dist * 2.5;
  });
  return <DepthOfField ref={ref} worldFocusDistance={60} worldFocusRange={150} bokehScale={1.4} resolutionScale={0.5} />;
}

export function Effects() {
  const quality = useStory((s) => s.quality);
  const chapter = useStory((s) => s.chapter);
  const lensNear = Math.abs(chapter - 4) <= 1;
  const composer = useRef<EffectComposerImpl>(null);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __composer: typeof composer }).__composer = composer;
  }, []);

  return (
    // Порядок проходов важен: DoF и Bloom читают входной буфер своего прохода,
    // поэтому линза идёт отдельным проходом после DoF и до Bloom — тогда bloom
    // светится уже на искривлённых звёздах и на фотонном кольце.
    <EffectComposer ref={composer} multisampling={0} enableNormalPass={false}>
      {quality === 'high' ? <Dof /> : <></>}
      {lensNear ? (
        <EffectGroup>
          <Lensing />
        </EffectGroup>
      ) : (
        <></>
      )}
      <EffectGroup>
        <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.2} mipmapBlur intensity={0.9} radius={0.55} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.5} />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectGroup>
    </EffectComposer>
  );
}
