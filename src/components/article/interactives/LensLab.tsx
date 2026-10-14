import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { StarCluster } from '../../../scene/StarCluster';
import { LensingEffect, type LensParams } from '../../../scene/effects/LensingEffect';
import { GPC, M_SUN, einsteinRadius, radToArcsec } from '../../../physics/lens';

/**
 * Облегчённый интерактив статьи «Гравитационная линза».
 * Ползунки меняют массу линзы и расстояние до неё; θ_E пересчитывается и
 * подставляется в формулу на странице (слоты .slot-* внутри KaTeX).
 */

const D_S_GPC = 2; // расстояние до источника, фиксировано

/** Формат числа по-русски: запятая, заданное число знаков. */
function ru(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function setSlot(cls: string, text: string) {
  document.querySelectorAll<HTMLElement>(`.${cls}`).forEach((el) => {
    if (el.textContent !== text) {
      el.textContent = text;
      el.classList.add('is-live');
    }
  });
}

function Lensing({ params }: { params: RefObject<LensParams> }) {
  const effect = useMemo(() => new LensingEffect((out) => Object.assign(out, params.current)), [params]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}

export default function LensLab() {
  // Масса в единицах 10¹¹ M☉ (1…50), расстояние до линзы в Гпк (0,2…1,8)
  const [massUnits, setMassUnits] = useState(10);
  const [dL, setDL] = useState(1.0);
  const [running, setRunning] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const params = useRef<LensParams>({ x: 0.5, y: 0.5, strength: 1, radius: 0.15 });

  const mass = massUnits * 1e11 * M_SUN;
  const dLS = D_S_GPC - dL; // упрощение: в расширяющейся Вселенной угловые расстояния так не вычитаются
  const thetaE = radToArcsec(einsteinRadius(mass, dL * GPC, D_S_GPC * GPC, dLS * GPC));

  // Условный масштаб картинки: 0,5″ … 6″ → 7 % … 30 % высоты кадра
  params.current.radius = Math.min(0.3, Math.max(0.07, 0.05 + 0.042 * thetaE));

  // Живые слоты в формуле
  useEffect(() => {
    const exp = Math.floor(Math.log10(massUnits * 1e11));
    const mant = (massUnits * 1e11) / 10 ** exp;
    setSlot('slot-mc', ru(mant, 1));
    setSlot('slot-me', String(exp));
    setSlot('slot-dl', ru(dL, 1));
    setSlot('slot-dls', ru(dLS, 1));
    setSlot('slot-te', ru(thetaE, 2));
  }, [massUnits, dL, dLS, thetaE]);

  // Рендерим только пока блок на экране
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Чёрная дыра следует за курсором или пальцем внутри полотна
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      const r = el.getBoundingClientRect();
      params.current.x = (e.clientX - r.left) / r.width;
      params.current.y = 1 - (e.clientY - r.top) / r.height;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', move);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', move);
    };
  }, []);

  const center = useMemo<[number, number, number]>(() => [0, 0, -70], []);
  const spread = useMemo<[number, number, number]>(() => [34, 20, 14], []);

  return (
    <div className="lab">
      <div className="lab-canvas" ref={wrap} role="img" aria-label="Звёздное поле с чёрной дырой-линзой; изображение интерактивно">
        <Canvas
          dpr={1}
          frameloop={running ? 'always' : 'never'}
          gl={{ antialias: false, powerPreference: 'low-power', alpha: false }}
          camera={{ fov: 50, near: 0.1, far: 500, position: [0, 0, 0] }}
        >
          <color attach="background" args={['#03040b']} />
          <StarCluster center={center} spread={spread} count={1600} scale={70} seed={11} />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Lensing params={params} />
          </EffectComposer>
        </Canvas>
        <p className="lab-hint">Двигайте чёрную дыру мышью или пальцем</p>
      </div>

      <div className="lab-controls">
        <label className="lab-row">
          <span className="field-label">
            <span>Масса линзы</span>
            <span className="num">{ru(massUnits / 10, 1)} × 10¹² M☉</span>
          </span>
          <input type="range" min={1} max={50} step={1} value={massUnits} onChange={(e) => setMassUnits(Number(e.target.value))} aria-valuetext={`${ru(massUnits / 10, 1)} триллиона масс Солнца`} />
        </label>
        <label className="lab-row">
          <span className="field-label">
            <span>Расстояние до линзы (источник на 2 Гпк)</span>
            <span className="num">{ru(dL, 1)} Гпк</span>
          </span>
          <input type="range" min={0.2} max={1.8} step={0.1} value={dL} onChange={(e) => setDL(Number(e.target.value))} aria-valuetext={`${ru(dL, 1)} гигапарсека`} />
        </label>
        <div className="lab-out" aria-live="polite">
          <div>
            <span className="label">Радиус кольца Эйнштейна</span>
            <span className="num">{ru(thetaE, 2)}″</span>
          </div>
          <div>
            <span className="label">Диаметр кольца</span>
            <span className="num">{ru(2 * thetaE, 1)}″</span>
          </div>
          <div>
            <span className="label">Для сравнения</span>
            <span className="num" style={{ fontSize: '0.95rem' }}>Луна ≈ 1800″</span>
          </div>
        </div>
        <p className="simplified">
          Упрощено: тонкая линза точечной массы, тень и кольцо нарисованы декоративно, размер кольца на экране не в масштабе, D<sub>LS</sub> = D<sub>S</sub> − D<sub>L</sub>
        </p>
      </div>
    </div>
  );
}
