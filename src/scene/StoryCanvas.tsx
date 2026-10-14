import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { detectQuality, hasWebGL, storyStore, useStory, type Quality } from '../story/store';
import { CameraRig } from './CameraRig';
import { Background } from './Background';
import { Chapters } from './Chapters';
import { Effects } from './Effects';

const ORDER: Quality[] = ['low', 'medium', 'high'];

function dprFor(q: Quality): number {
  const d = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  if (q === 'high') return Math.min(2, d);
  if (q === 'medium') return Math.min(1.5, d);
  return 1;
}

export default function StoryCanvas() {
  const [ok] = useState(() => hasWebGL());
  const quality = useStory((s) => s.quality);

  useEffect(() => {
    const st = storyStore.getState();
    st.setWebgl(ok);
    document.documentElement.classList.toggle('no-webgl', !ok);
    const q = detectQuality();
    st.setQuality(q);
    st.setMaxQuality(q);
    // На узком экране текст прижат к низу, чёрную дыру ставим выше и по центру
    if (window.innerWidth < 768) {
      st.lens.x = 0.5;
      st.lens.y = 0.7;
    }
  }, [ok]);

  if (!ok) return null;

  const step = (dir: 1 | -1) => {
    const st = storyStore.getState();
    const i = ORDER.indexOf(st.quality) + dir;
    if (i >= 0 && i <= ORDER.indexOf(st.maxQuality)) st.setQuality(ORDER[i]);
  };

  return (
    <Canvas
      id="story-canvas"
      dpr={dprFor(quality)}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      camera={{ fov: 55, near: 0.1, far: 1200, position: [0, 0, 0] }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
    >
      <color attach="background" args={['#05060f']} />
      <PerformanceMonitor
        flipflops={3}
        factor={1}
        threshold={0.5}
        bounds={() => [30, 55]}
        onDecline={() => step(-1)}
        onIncline={() => step(1)}
      >
        <CameraRig />
        <Suspense fallback={null}>
          <Background />
          <Chapters />
        </Suspense>
        <Effects />
      </PerformanceMonitor>
    </Canvas>
  );
}
