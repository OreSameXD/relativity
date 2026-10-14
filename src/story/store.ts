import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export type Quality = 'high' | 'medium' | 'low';

/**
 * Объект камеры мутируется GSAP напрямую (без setState), сцена читает его в useFrame.
 * Это сознательно вне реактивного состояния: меняется каждый кадр.
 */
export interface CamState {
  /** Параметр кривой 0..1; якорь главы N при t = N/(глав-1) */
  t: number;
  look: { x: number; y: number; z: number };
  /** 0 в удержании, 1 в середине перелёта (для FOV и пыли) */
  travel: number;
  /** Фаза перелёта к текущей главе: 0 в начале, 1 в конце и всё удержание */
  phase: number;
}

/** Мутируемый объект (как cam): GSAP твинит strength, указатель пишет x/y. Не пересоздавать. */
export interface LensState {
  /** Цель положения чёрной дыры в UV экрана (0..1, y вверх) */
  x: number;
  y: number;
  /** 0..1, твинится таймлайном: вкл/выкл эффекта */
  strength: number;
}

export interface StoryState {
  chapter: number;
  progress: number;
  quality: Quality;
  /** Потолок качества для устройства: телефон не поднимается выше medium */
  maxQuality: Quality;
  reducedMotion: boolean;
  webgl: boolean;
  cam: CamState;
  lens: LensState;
  /** Масса чёрной дыры 0..1 → радиус Эйнштейна (реактивно: нужно UI) */
  lensMass: number;
  /** Глава 1: скорость летящих часов, β = v/c, 0..0,99 */
  clocksBeta: number;
  /** Глава 1: сколько тиков отсчитали часы (сцена пишет только при изменении) */
  clockTicks: { rest: number; moving: number };
  /** Увеличивается при сбросе: сцена обнуляет симуляцию */
  clockResetKey: number;
  /** Глава 2: скорость корабля β и длительность полёта по часам Земли (лет) */
  twinsBeta: number;
  twinsYears: number;
  twinsPhase: 'idle' | 'flying' | 'done';
  twinsLaunchKey: number;
  /** Мутируемый объект: сцена пишет прогресс полёта и возраст каждый кадр */
  twinsSim: { progress: number; earthYears: number; shipYears: number };
  /** Глава 3: массы на сетке (мировые координаты x, z) и выбранный тип */
  gravityMasses: Array<{ x: number; z: number; kind: 'star' | 'hole' }>;
  gravityKind: 'star' | 'hole';
  /** Глава 5: релятивистская поправка в приёмнике включена */
  gpsCorrection: boolean;
  setChapter: (n: number) => void;
  setProgress: (p: number) => void;
  setQuality: (q: Quality) => void;
  setMaxQuality: (q: Quality) => void;
  setWebgl: (ok: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setLensTarget: (x: number, y: number) => void;
  setLensMass: (m: number) => void;
  setClocksBeta: (b: number) => void;
  setClockTicks: (rest: number, moving: number) => void;
  resetClocks: () => void;
  setTwinsBeta: (b: number) => void;
  setTwinsYears: (y: number) => void;
  launchTwins: () => void;
  finishTwins: () => void;
  resetTwins: () => void;
  setGravityKind: (k: 'star' | 'hole') => void;
  addGravityMass: (x: number, z: number) => void;
  clearGravityMasses: () => void;
  setGpsCorrection: (on: boolean) => void;
}

export const storyStore = createStore<StoryState>((set, get) => ({
  chapter: 0,
  progress: 0,
  quality: 'high',
  maxQuality: 'high',
  reducedMotion: false,
  webgl: true,
  cam: { t: 0, look: { x: 0, y: 0, z: -60 }, travel: 0, phase: 1 },
  lens: { x: 0.64, y: 0.52, strength: 0 },
  lensMass: 0.5,
  clocksBeta: 0.6,
  clockTicks: { rest: 0, moving: 0 },
  clockResetKey: 0,
  twinsBeta: 0.8,
  twinsYears: 10,
  twinsPhase: 'idle',
  twinsLaunchKey: 0,
  twinsSim: { progress: 0, earthYears: 0, shipYears: 0 },
  gravityMasses: [],
  gravityKind: 'star',
  gpsCorrection: true,
  setChapter: (chapter) => set({ chapter }),
  setProgress: (progress) => set({ progress }),
  setQuality: (quality) => set({ quality }),
  setMaxQuality: (maxQuality) => set({ maxQuality }),
  setWebgl: (webgl) => set({ webgl }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setLensTarget: (x, y) => {
    const { lens } = get();
    lens.x = x;
    lens.y = y;
  },
  setLensMass: (lensMass) => set({ lensMass }),
  setClocksBeta: (clocksBeta) => set({ clocksBeta }),
  setClockTicks: (rest, moving) => {
    const t = get().clockTicks;
    if (t.rest !== rest || t.moving !== moving) set({ clockTicks: { rest, moving } });
  },
  resetClocks: () => set((s) => ({ clockResetKey: s.clockResetKey + 1, clockTicks: { rest: 0, moving: 0 } })),
  setTwinsBeta: (twinsBeta) => set({ twinsBeta }),
  setTwinsYears: (twinsYears) => set({ twinsYears }),
  launchTwins: () => set((s) => ({ twinsPhase: 'flying', twinsLaunchKey: s.twinsLaunchKey + 1 })),
  finishTwins: () => set({ twinsPhase: 'done' }),
  setGravityKind: (gravityKind) => set({ gravityKind }),
  addGravityMass: (x, z) =>
    set((s) => {
      // не ближе 3 единиц к уже стоящей массе и не больше 6 штук
      if (s.gravityMasses.some((m) => Math.hypot(m.x - x, m.z - z) < 3)) return {};
      const next = [...s.gravityMasses, { x, z, kind: s.gravityKind }];
      return { gravityMasses: next.length > 6 ? next.slice(next.length - 6) : next };
    }),
  clearGravityMasses: () => set({ gravityMasses: [] }),
  setGpsCorrection: (gpsCorrection) => set({ gpsCorrection }),
  resetTwins: () => {
    const sim = get().twinsSim;
    sim.progress = 0;
    sim.earthYears = 0;
    sim.shipYears = 0;
    set({ twinsPhase: 'idle' });
  },
}));

export function useStory<T>(selector: (s: StoryState) => T): T {
  return useStore(storyStore, selector);
}

/** Начальный уровень качества по устройству. */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  return coarse || narrow ? 'medium' : 'high';
}

export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
