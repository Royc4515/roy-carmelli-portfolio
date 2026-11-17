import { useEffect, useRef } from 'react';
import { bio } from '../shared/content';
import { ParticleField, type FieldState, type Palette, type Rgb } from './particles';
import { SHAPES, nameShape, sampleShape, type Shape } from './shapes';

export interface SceneDef {
  /** The DOM section this shape belongs to carries `data-scene="<id>"`. */
  id: string;
  shape: keyof typeof SHAPES | 'name';
  /** Two colours per theme; each particle picks a mix of them. */
  dark: Palette;
  light: Palette;
  /** Which side of a wide screen the shape takes (the text takes the other). */
  side: 'center' | 'left' | 'right';
}

const hex = (value: string): Rgb => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255,
];
const pal = (a: string, b: string): Palette => ({ a: hex(a), b: hex(b) });

export const SCENES: SceneDef[] = [
  { id: 'top', shape: 'name', side: 'center', dark: pal('#f2f6ff', '#7fb8ff'), light: pal('#0f1b3d', '#2f5fd0') },
  { id: 'ai-sidebar', shape: 'browser', side: 'right', dark: pal('#ffd0a8', '#ff6a3d'), light: pal('#b8431c', '#e2622e') },
  { id: 'nechita-raka', shape: 'parachute', side: 'left', dark: pal('#bfe6ff', '#3f8cff'), light: pal('#1553c0', '#2c86d6') },
  { id: 'sommelier-bot', shape: 'wine', side: 'right', dark: pal('#ffb3c8', '#e0245e'), light: pal('#8c1238', '#c2255c') },
  { id: 'more', shape: 'braces', side: 'left', dark: pal('#c9ffe0', '#2fd39a'), light: pal('#0b6e4f', '#12956b') },
  { id: 'about', shape: 'brain', side: 'right', dark: pal('#ecd0ff', '#9a5cff'), light: pal('#5a2bc4', '#8647e0') },
  { id: 'contact', shape: 'plane', side: 'left', dark: pal('#fff0bd', '#ffb21f'), light: pal('#8a5a00', '#b97c05') },
];

const DARK_BG: Rgb = [0.02, 0.027, 0.055];
const LIGHT_BG: Rgb = [0.965, 0.97, 0.985];
const PHONE = 768;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

interface StageProps {
  dark: boolean;
  /** Idle motion on or off (the pause button, and `prefers-reduced-motion`). */
  motion: boolean;
  reduced: boolean;
  onReady: (ok: boolean) => void;
  onScene: (index: number) => void;
}

/**
 * The fixed full-viewport canvas behind the page. It owns the render loop and turns scroll
 * position into a morph between the shapes of the two sections nearest the viewport centre.
 */
export function ParticleStage({ dark, motion, reduced, onReady, onScene }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live values the loop reads without re-subscribing.
  const live = useRef({ dark, motion, reduced });
  live.current = { dark, motion, reduced };
  const fieldRef = useRef<ParticleField | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const params = new URLSearchParams(window.location.search);
    // `?particles=N` pins the count (and turns adaptive quality off): used for captures.
    const pinned = Number(params.get('particles')) || 0;
    const small = window.innerWidth < PHONE;
    const count = pinned || (small || (navigator.hardwareConcurrency ?? 8) <= 4 ? 30000 : 64000);
    const field = ParticleField.create(canvas, count);
    if (!field) {
      onReady(false);
      return;
    }
    fieldRef.current = field;

    let aspect = 1;
    let wide = !small;
    const shapeFor = (scene: SceneDef): Shape =>
      scene.shape === 'name' ? nameShape(bio.name, wide) : SHAPES[scene.shape];
    let shapeAspects: number[] = [];
    const upload = () => {
      shapeAspects = SCENES.map((scene, i) => {
        const shape = shapeFor(scene);
        field.setShape(i, sampleShape(shape, field.particleCount), live.current.dark ? scene.dark : scene.light);
        return shape.aspect;
      });
    };

    /** Where scene `i` sits and how large, for the current viewport. */
    const anchor = (i: number) => {
      const scene = SCENES[i];
      const shapeAspect = shapeAspects[i] ?? 1;
      if (scene.side === 'center') {
        // The name spans the screen width.
        const scale = Math.min((aspect * (wide ? 0.9 : 0.94)) / shapeAspect, 0.5);
        return { x: 0, y: wide ? 0.3 : 0.42, scale };
      }
      if (!wide) {
        // Phones: the shape sits in the upper part, the text card scrolls over it.
        const scale = Math.min((aspect * 0.78) / shapeAspect, 0.36);
        return { x: 0, y: 0.38, scale };
      }
      const half = aspect * 0.5;
      const scale = Math.min((half * 0.8) / shapeAspect, 0.62);
      return { x: (scene.side === 'right' ? 1 : -1) * half * 0.98, y: 0.02, scale };
    };

    let sections: HTMLElement[] = [];
    let centers: number[] = [];
    const measure = () => {
      aspect = field.resize(small ? 1.75 : 2);
      const nowWide = window.innerWidth >= PHONE;
      if (nowWide !== wide) {
        wide = nowWide;
        upload();
      }
      sections = SCENES.map(scene => document.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`)).filter(
        (el): el is HTMLElement => !!el,
      );
      centers = sections.map(el => {
        const rect = el.getBoundingClientRect();
        // A section's shape is whole when its card is centred in the viewport. On phones the
        // card starts low in a tall section, so aim at the card instead of the section.
        const card = el.querySelector<HTMLElement>('.oe-card')?.getBoundingClientRect();
        // Phones: the shape is whole while the card is still rising from the bottom of the
        // screen (its top at about 62%), and starts to change as the card covers it.
        if (card && window.innerWidth < PHONE) return card.top + window.scrollY - window.innerHeight * 0.12;
        const box = card && card.height < window.innerHeight ? card : rect;
        return box.top + window.scrollY + Math.min(box.height, window.innerHeight) / 2;
      });
      // The first scene is the top of the page, so the name is whole on arrival.
      if (centers.length) centers[0] = window.innerHeight / 2;
    };

    /** Scroll position as a transition between two neighbouring scenes. */
    const target = (): FieldState => {
      const at = window.scrollY + window.innerHeight / 2;
      let i = 0;
      while (i < centers.length - 2 && at >= centers[i + 1]) i++;
      const span = Math.max(1, centers[i + 1] - centers[i]);
      // Hold each shape for the first and last fifth of the way, morph in between.
      const t = clamp01(((at - centers[i]) / span - 0.2) / 0.6);
      const a = anchor(i);
      const b = anchor(Math.min(i + 1, SCENES.length - 1));
      const e = smooth(t);
      return {
        from: i,
        to: Math.min(i + 1, SCENES.length - 1),
        t,
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        scale: a.scale + (b.scale - a.scale) * e,
      };
    };

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0 };
    const tilt = { x: 0, y: 0 };
    const toWorld = (clientX: number, clientY: number) => ({
      x: ((clientX / window.innerWidth) * 2 - 1) * aspect,
      y: -((clientY / window.innerHeight) * 2 - 1),
    });
    const onMove = (event: PointerEvent) => {
      const world = toWorld(event.clientX, event.clientY);
      pointer.tx = world.x;
      pointer.ty = world.y;
      pointer.target = 1;
    };
    const gyro = { on: false, x: 0, y: 0 };
    const onOrient = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return;
      gyro.on = true;
      const clampTo = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
      // gamma: left/right tilt. beta: front/back, about 45 degrees when held in the hand.
      gyro.x = clampTo(event.gamma / 45, 1) * 0.45;
      gyro.y = clampTo((event.beta - 45) / 45, 1) * 0.3;
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    const onDown = (event: PointerEvent) => {
      const world = toWorld(event.clientX, event.clientY);
      // A touch has no hover: place the pointer where the finger landed.
      pointer.x = pointer.tx = world.x;
      pointer.y = pointer.ty = world.y;
      if (!live.current.reduced) field.startBurst(world.x, world.y, clock());
      if (event.pointerType !== 'mouse') {
        pointer.target = 1;
        window.setTimeout(() => (pointer.target = 0), 900);
      }
    };

    const start = performance.now();
    const clock = () => (performance.now() - start) / 1000;
    const state: FieldState = { from: 0, to: 1, t: 0, x: 0, y: 0, scale: 0.4 };
    let first = true;
    let lastScene = -1;
    let lastDark = live.current.dark;
    let raf = 0;
    let running = false;
    // Adaptive quality: average frame time over a window, then shed particles if it is slow.
    let frames = 0;
    let windowStart = performance.now();

    const frame = () => {
      raf = 0;
      const { dark: isDark, motion: moving, reduced: still } = live.current;
      if (isDark !== lastDark) {
        lastDark = isDark;
        SCENES.forEach((scene, i) => field.setPalette(i, isDark ? scene.dark : scene.light));
      }
      field.setTheme(isDark);
      const goal = target();
      // Ease towards the scroll target, so a wheel click becomes a glide. No easing when the
      // visitor asked for less motion: the shape follows the scroll position exactly.
      const k = first || still ? 1 : 0.14;
      state.from = goal.from;
      state.to = goal.to;
      state.t += (goal.t - state.t) * k;
      state.x += (goal.x - state.x) * k;
      state.y += (goal.y - state.y) * k;
      state.scale += (goal.scale - state.scale) * k;
      first = false;

      pointer.x += (pointer.tx - pointer.x) * 0.18;
      pointer.y += (pointer.ty - pointer.y) * 0.18;
      pointer.on += (pointer.target - pointer.on) * 0.1;
      // The cloud leans with the pointer on a desktop, and with the device itself on a phone
      // that reports its orientation.
      let leanX = 0;
      let leanY = 0;
      if (!still) {
        if (gyro.on) {
          leanX = gyro.x;
          leanY = gyro.y;
        } else if (wide) {
          leanX = (pointer.tx / Math.max(aspect, 0.01)) * 0.22;
          leanY = -pointer.ty * 0.14;
        }
      }
      tilt.x += (leanX - tilt.x) * 0.06;
      tilt.y += (leanY - tilt.y) * 0.06;

      const time = clock();
      field.render(state, {
        time: moving ? time : 0,
        intro: still ? 1 : clamp01(time / 2.4),
        motion: moving ? 1 : 0,
        tiltX: tilt.x,
        tiltY: tilt.y,
        pointerX: pointer.x,
        pointerY: pointer.y,
        pointerOn: still ? 0 : pointer.on,
        bg: isDark ? DARK_BG : LIGHT_BG,
      });

      const scene = state.t > 0.5 ? state.to : state.from;
      if (scene !== lastScene) {
        lastScene = scene;
        onScene(scene);
      }

      if (!pinned && ++frames === 50) {
        const average = (performance.now() - windowStart) / frames;
        if (average > 30) field.degrade();
        frames = 0;
        windowStart = performance.now();
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (running) return;
      running = true;
      frames = 0;
      windowStart = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    /** With motion off there is no loop: draw one frame when something changes. */
    const poke = () => {
      if (!running && !raf) raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const { motion: moving, reduced: still } = live.current;
      if (document.hidden || still || !moving) {
        stop();
        if (!document.hidden) poke();
      } else play();
    };

    const onResize = () => {
      measure();
      poke();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      stop();
      onReady(false);
    };

    let cancelled = false;
    const boot = () => {
      if (cancelled) return;
      measure();
      upload();
      onReady(true);
      sync();
    };
    // The name is drawn with the page's own font: wait for it, or the sample is a fallback face.
    const fonts = document.fonts;
    if (fonts?.load) fonts.load('800 80px "Inter Variable"').then(boot, boot);
    else boot();

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    resizeObserver?.observe(document.body);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', poke, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', sync);
    // Android reports this without asking; iOS needs a permission prompt, which is not worth
    // interrupting a visitor for, so there the cloud simply does not lean.
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    canvas.addEventListener('webglcontextlost', onLost);
    // The loop re-reads `live` every frame, but starting and stopping it needs a nudge.
    const settingsTimer = window.setInterval(sync, 400);

    return () => {
      cancelled = true;
      stop();
      window.clearInterval(settingsTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', poke);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('deviceorientation', onOrient);
      canvas.removeEventListener('webglcontextlost', onLost);
      field.destroy();
      fieldRef.current = null;
    };
    // The stage is created once; theme and motion changes reach it through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="oe-stage" aria-hidden="true" />;
}
