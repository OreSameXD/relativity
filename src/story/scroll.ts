/**
 * Контроллер скролла главной: Lenis + GSAP ScrollTrigger + мастер-таймлайн.
 * Vanilla TS, ничего не знает о Three. Пишет в storyStore: cam (мутация), chapter, progress, lens.strength.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import { CHAPTERS, HOLD_LEAVE, HOLD_SETTLE, TOTAL_UNITS, chapterSettle, chapterStart } from './chapters';
import { storyStore } from './store';

gsap.registerPlugin(ScrollTrigger);

const LAST = CHAPTERS.length - 1;

function sectionOf(root: HTMLElement, index: number): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-chapter="${index}"]`);
  if (!el) throw new Error(`Нет секции главы ${index}`);
  return el;
}

/** Индекс главы по времени таймлайна (перелёт к главе считается её частью). */
function chapterAt(u: number): number {
  for (let i = LAST; i >= 0; i--) if (u >= chapterStart(i)) return i;
  return 0;
}

export function initStory(root: HTMLElement): () => void {
  const store = storyStore;
  if (import.meta.env.DEV) (window as unknown as { __story: typeof storyStore }).__story = storyStore;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  store.getState().setReducedMotion(reduced);

  // Высота секций — из единого списка глав.
  for (const c of CHAPTERS) {
    sectionOf(root, c.index).style.height = `${(c.travel + c.hold) * 100}vh`;
  }

  const hint = document.querySelector<HTMLElement>('.scroll-hint');
  const onFirstScroll = () => {
    if (window.scrollY > 40) hint?.classList.add('is-hidden');
    else hint?.classList.remove('is-hidden');
  };
  window.addEventListener('scroll', onFirstScroll, { passive: true });

  if (reduced) {
    const cleanup = initReduced(root);
    return () => {
      cleanup();
      window.removeEventListener('scroll', onFirstScroll);
    };
  }

  // --- Lenis ---------------------------------------------------------------
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // --- Мастер-таймлайн -----------------------------------------------------
  const { cam, lens } = store.getState();
  const proxy = { u: 0 };
  let lastChapter = -1;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    // Глава определяется по времени самого таймлайна: scrub догоняет скролл с задержкой,
    // а onUpdate у ScrollTrigger срабатывает только при движении скролла.
    onUpdate: () => {
      const ch = chapterAt(proxy.u);
      if (ch !== lastChapter) {
        lastChapter = ch;
        store.getState().setChapter(ch);
      }
    },
    scrollTrigger: {
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: (self) => {
        store.getState().setProgress(self.progress);
        hint?.classList.toggle('is-hidden', self.scroll() > 40);
      },
    },
  });

  // Пустой твин задаёт полную длину таймлайна и даёт текущее время в единицах.
  tl.to(proxy, { u: TOTAL_UNITS, duration: TOTAL_UNITS }, 0);

  for (const c of CHAPTERS) {
    const start = chapterStart(c.index);
    const holdStart = start + c.travel;
    const copy = sectionOf(root, c.index).querySelector<HTMLElement>('.copy');

    if (c.travel > 0) {
      tl.to(cam, { t: c.index / LAST, duration: c.travel, ease: 'power2.inOut' }, start);
      tl.to(cam.look, { x: c.look[0], y: c.look[1], z: c.look[2], duration: c.travel, ease: 'power2.inOut' }, start);
      tl.to(cam, { travel: 1, duration: c.travel / 2, ease: 'sine.in' }, start);
      tl.to(cam, { travel: 0, duration: c.travel / 2, ease: 'sine.out' }, start + c.travel / 2);
    }

    if (copy) {
      if (c.travel > 0) {
        tl.fromTo(copy, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: c.hold * HOLD_SETTLE, ease: 'power2.out' }, holdStart);
      } else {
        gsap.set(copy, { opacity: 1, y: 0 });
      }
      if (c.index < LAST) {
        tl.to(copy, { opacity: 0, y: -24, duration: c.hold * (1 - HOLD_LEAVE), ease: 'power2.in' }, holdStart + c.hold * HOLD_LEAVE);
      }
    }

    tl.addLabel(c.id, c.index === 0 ? 0 : chapterSettle(c.index));

    if (c.id === 'lens') {
      tl.to(lens, { strength: 1, duration: c.travel * 0.6, ease: 'sine.inOut' }, start + c.travel * 0.4);
      tl.to(lens, { strength: 0, duration: 0.6, ease: 'sine.inOut' }, holdStart + c.hold);
    }
  }

  // --- Snap к кадрам глав (Lenis Snap) --------------------------------------
  const snap = new Snap(lenis, {
    type: 'proximity',
    distanceThreshold: '45%',
    duration: 0.9,
    debounce: 250,
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  let removeSnaps: Array<() => void> = [];
  const settlePx = (index: number) => {
    const maxScroll = root.offsetHeight - window.innerHeight;
    const units = index === 0 ? 0 : chapterSettle(index);
    return (units / TOTAL_UNITS) * maxScroll;
  };
  const rebuildSnaps = () => {
    removeSnaps.forEach((r) => r());
    removeSnaps = CHAPTERS.map((c) => snap.add(settlePx(c.index)));
  };
  rebuildSnaps();
  ScrollTrigger.addEventListener('refresh', rebuildSnaps);

  // --- Навигация по хэшу (/#lens) --------------------------------------------
  const goToHash = (immediate: boolean) => {
    const id = location.hash.replace('#', '');
    const c = CHAPTERS.find((x) => x.id === id);
    if (c) lenis.scrollTo(settlePx(c.index), { immediate, duration: 1.2 });
  };
  ScrollTrigger.refresh();
  // Браузер сам прыгает к началу секции #id при загрузке (в том числе после load);
  // несколько раз перебиваем его своим положением кадра.
  history.scrollRestoration = 'manual';
  if (location.hash) {
    const jump = () => goToHash(true);
    requestAnimationFrame(jump);
    const afterLoad = () => {
      setTimeout(jump, 0);
      setTimeout(jump, 120);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }
  const onHash = () => goToHash(false);
  window.addEventListener('hashchange', onHash);

  return () => {
    ScrollTrigger.removeEventListener('refresh', rebuildSnaps);
    removeSnaps.forEach((r) => r());
    snap.destroy();
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.ticker.remove(tick);
    lenis.destroy();
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('scroll', onFirstScroll);
  };
}

/** prefers-reduced-motion: без полёта камеры, главы просто сменяются. */
function initReduced(root: HTMLElement): () => void {
  const store = storyStore;
  const { cam, lens } = store.getState();
  const fade = document.getElementById('fade');
  root.classList.add('is-reduced');

  const triggers = CHAPTERS.map((c) =>
    ScrollTrigger.create({
      trigger: sectionOf(root, c.index),
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive) return;
        store.getState().setChapter(c.index);
        if (fade) {
          gsap.timeline()
            .to(fade, { opacity: 1, duration: 0.2 })
            .call(() => {
              cam.t = c.index / LAST;
              cam.look.x = c.look[0];
              cam.look.y = c.look[1];
              cam.look.z = c.look[2];
              lens.strength = c.id === 'lens' ? 1 : 0;
            })
            .to(fade, { opacity: 0, duration: 0.25 });
        }
      },
    }),
  );
  return () => triggers.forEach((t) => t.kill());
}
