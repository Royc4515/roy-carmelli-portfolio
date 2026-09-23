import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { AnimatePresence, motion, steps, type Transition } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';
import ArcadeFallback from '../components/ArcadeFallback';
import PixelPanel from '../components/PixelPanel';
import PixelIcon from '../components/PixelIcon';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { cx } from '../components/ui/cx';
import { useIsMobile } from '../hooks/useIsMobile';
import { useGameDisplayMode } from '../hooks/useGameDisplayMode';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { pixelSprites } from '../theme/pixelSprites';
import { duration, ease, seconds } from '../theme/motion';
import './Hero.css';

/** The game (engine, sprites, canvas) loads only when someone presses start. */
const MiniGame = lazy(() => import('../components/MiniGame/MiniGame'));

/* ── Scene geometry ────────────────────────────────────────────────────────
   The forest (240x112 native) and Roy share one pixel grid: both are drawn at
   the same integer scale k, Roy standing on the forest's grass line with his
   feet on forest column 182 (right of centre, clear of the three birds baked
   into the art). The forest's left offset is derived from where the
   composition puts Roy, so that column lands exactly under his feet.

   Scale: k = max(ceil(W / 240), floor(H / 112)), one step under "cover", so
   Roy stays about 55% of the scene and the canopy, birds and fences stay in
   view. A forest shorter than the scene is anchored to the top and the ground
   gets deeper: its bottom dirt rows repeat, mirrored row-wise, down to the
   scene bottom. A forest taller than the scene is anchored to the bottom (the
   canopy crops). When covering the width would push Roy past 60% of the scene
   (1920x1080 under the 880px cap, ultrawide, short windows) k stays at
   floor(H / 112) and mirrored copies of the forest, seamless at the shared
   edge, fill the sides. */

const FOREST = pixelSprites.forest;
const WAVE = pixelSprites.wave;

/** Forest column Roy's feet stand on. */
export const HERO_FEET_COLUMN = 182;
/** Fixed navbar height; the scene starts below it. */
export const HERO_NAV_H = 64;
/** The hero is at most this tall (nav included). */
export const HERO_MAX_H = 880;
/** Title-card width on the scene (fits two lg CTAs side by side at p-6). */
export const HERO_CARD_W = 544;
/** Scale of the band on phones. */
export const HERO_MOBILE_K = 3;
/** Roy's sprite may take at most this share of the desktop scene height. */
export const HERO_MAX_SHARE = 0.6;
/**
 * Native columns [from, to) of the three birds baked into the forest. The title card's right
 * edge must never slice one: each is either fully behind the card or clear of it.
 */
export const FOREST_BIRD_COLUMNS: ReadonlyArray<readonly [number, number]> = [
  [119, 132],
  [136, 150],
  [150, 163],
];
/** Native forest rows repeated to deepen the ground (the bottom four dirt rows). */
export const GROUND_STRIP_ROWS = 4;

const CONTAINER_W = 1120;
/** The card's 4px frame plus its 8px drop, right of its box. */
const CARD_OUTSET = 12;
/** Minimum air between Roy and the card. */
const STAGE_AIR = 32;
/** Minimum air between Roy and the scene's right edge. */
const EDGE_AIR = 16;
/** First dirt row under the grass (rows 106-111 are dirt): the scroll cue sits below it. */
const DIRT_ROW = 106;
/** The title card sits at least this far below the scene top (level with the HUD). */
const CARD_TOP_MIN = 16;
/** Air kept under the title card's drop, inside the scene. */
const CARD_BOTTOM_AIR = 24;
/** The card's drop reaches 12px below its box (4px frame + 8px drop). */
const CARD_DROP = 12;
/** Card height used before it has been measured. */
const CARD_H_ESTIMATE = 520;
/** The HUD nameplate: 16px below the scene top, its box 238x89 plus a 4px frame and 8px drop. */
const HUD_TOP = 16;
const HUD_W = 238;
const HUD_H = 89;
/** Placement costs (px of distance from the ideal spot are worth 1). */
const COST_COLLISION = 1000;
const COST_OPTIONAL_MIRROR = 300;

export type HeroLayout =
  /** Scene fills the hero; card and HUD float over it (desktop). */
  | 'overlay'
  /** Scene is a band; the card flows below it (phones, narrow portrait tablets). */
  | 'stack';

export interface HeroScene {
  layout: HeroLayout;
  /** Integer scale shared by the forest and Roy. */
  k: number;
  /** Scene height in px (stack: the whole forest, 112k). */
  sceneH: number;
  /** Forest left edge in px from the scene's left (< 0: cropped). */
  forestX: number;
  /** Forest top edge in px from the scene's top (< 0: canopy cropped). */
  forestY: number;
  /** Depth of repeated dirt under the forest, down to the scene bottom (0: none). */
  groundExtraH: number;
  /** A mirrored copy of the forest fills the scene left of `forestX`. */
  mirrorLeft: boolean;
  /** A mirrored copy of the forest fills the scene right of the forest. */
  mirrorRight: boolean;
  /** Roy's sprite left edge in px from the scene's left. */
  spriteX: number;
  /** Grass line height above the scene bottom: Roy's bottom offset. */
  groundH: number;
  /** Height of the dirt (under the grass) above the scene bottom. */
  dirtH: number;
  /** Desktop: the HUD nameplate has room above Roy's head. */
  hudClear: boolean;
}

function gutterFor(width: number): number {
  if (width >= 1024) return 32;
  if (width >= 768) return 24;
  return 16;
}

/** Left edge of the page container's content (`max-w-[1120px]` + gutters) in a `width` px wide box. */
export function containerContentLeft(width: number): number {
  return Math.max(0, Math.floor((width - CONTAINER_W) / 2)) + gutterFor(width);
}

/**
 * Desktop scene scale: max(ceil(W / 240), floor(H / 112)), unless covering the width would make
 * Roy more than HERO_MAX_SHARE of the scene height; then floor(H / 112) (mirrors fill the sides).
 */
export function sceneScale(width: number, height: number): number {
  const byHeight = Math.max(1, Math.floor(height / FOREST.h));
  const byWidth = Math.ceil(width / FOREST.w);
  if (byWidth <= byHeight) return byHeight;
  return (WAVE.frameH * byWidth) / height <= HERO_MAX_SHARE ? byWidth : byHeight;
}

/** Top of the forest in the scene: anchored to the top when shorter, to the bottom when taller. */
function forestYFor(k: number, sceneH: number): number {
  return Math.min(0, sceneH - FOREST.h * k);
}

/** Grass line height above the scene bottom. */
function groundHFor(k: number, sceneH: number): number {
  return sceneH - forestYFor(k, sceneH) - FOREST.groundRow * k;
}

/** Sprite left edge → forest left edge, so the feet land on HERO_FEET_COLUMN. */
function forestXFor(spriteX: number, k: number): number {
  return spriteX - (HERO_FEET_COLUMN - WAVE.anchorX) * k;
}

/** True when no bird is sliced by an occluding edge at x = `edge` (one tucked column is fine). */
function birdsClear(forestX: number, k: number, edge: number): boolean {
  return FOREST_BIRD_COLUMNS.every(([from, to]) => {
    const b0 = forestX + from * k;
    const b1 = forestX + to * k;
    const hidden = Math.min(Math.max(edge - b0, 0), b1 - b0);
    return hidden === b1 - b0 || hidden <= k;
  });
}

/** True when Roy's sprite at `spriteX` would touch the HUD nameplate (with 8px of air). */
function hitsHud(spriteX: number, k: number, width: number, sceneH: number): boolean {
  const air = 8;
  const hudRight = width - containerContentLeft(width);
  const hudL = hudRight - HUD_W - 4 - air; // frame, air
  const hudR = hudRight + 4 + 4 + air; // frame, drop, air
  const hudBottom = HUD_TOP + HUD_H + 4 + 8 + air; // frame, drop, air
  const spriteTop = sceneH - groundHFor(k, sceneH) - WAVE.frameH * k;
  return spriteTop < hudBottom && spriteX < hudR && spriteX + WAVE.frameW * k > hudL;
}

/** True when the HUD nameplate clears the title card's right edge by 16px. */
function hudBesideCard(width: number): boolean {
  const left = containerContentLeft(width);
  return width - left - HUD_W - 4 >= left + HERO_CARD_W + CARD_OUTSET + 16;
}

export interface OverlayPlacement {
  /** Roy's sprite left edge, whole px. */
  spriteX: number;
  /** False when no position keeps Roy clear of the HUD: the HUD is then left out. */
  hudClear: boolean;
}

/**
 * Desktop placement of Roy's sprite in a `width` x `sceneH` scene, or null when he does not
 * fit beside the title card. Ideal: centred between the card and the container's right edge
 * (under the HUD), or hugging the right gutter when that stage is too narrow. Every whole
 * pixel of the allowed range is then scored: distance from the ideal, plus a heavy cost if the
 * card's edge would slice a bird or Roy's head would touch the HUD, plus a cost for showing a
 * mirrored forest copy that a plain crop would not need.
 */
export function placeOverlaySprite(width: number, sceneH: number): OverlayPlacement | null {
  const k = sceneScale(width, sceneH);
  const spriteW = WAVE.frameW * k;
  const forestW = FOREST.w * k;
  const left = containerContentLeft(width);
  const cardEdge = left + HERO_CARD_W + CARD_OUTSET;
  const lo = cardEdge + STAGE_AIR;
  const hi = width - EDGE_AIR - spriteW;
  if (hi < lo) return null;

  const stageR = width - left;
  const ideal = stageR - lo >= spriteW ? lo + (stageR - lo - spriteW) / 2 : hi;
  const cropOnly = forestW >= width;

  let best = { spriteX: Math.round(ideal), hudClear: true };
  let bestCost = Infinity;
  for (let x = lo; x <= hi; x += 1) {
    const forestX = forestXFor(x, k);
    // Mirrored copies can fill at most one forest width per side.
    if (forestX > forestW || forestX + 2 * forestW < width) continue;
    const mirrored = forestX > 0 || forestX + forestW < width;
    const hud = hitsHud(x, k, width, sceneH);
    const cost =
      Math.abs(x - ideal) +
      (birdsClear(forestX, k, cardEdge) ? 0 : COST_COLLISION) +
      (hud ? COST_COLLISION : 0) +
      (mirrored && cropOnly ? COST_OPTIONAL_MIRROR : 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = { spriteX: x, hudClear: !hud };
    }
  }
  return best;
}

/**
 * Card-driven minimum scene height: a scene shorter than the card plus its margins grows to
 * fit it, which also raises k.
 */
const MIN_OVERLAY_SCENE_H = CARD_TOP_MIN + CARD_H_ESTIMATE + CARD_DROP + CARD_BOTTOM_AIR;

/**
 * Overlay (desktop) when the viewport is ≥ 768px and Roy fits beside the title card at the
 * scene scale; otherwise the stacked band layout. Decided from the viewport only (never from
 * the measured scene) so the choice cannot oscillate.
 */
export function chooseHeroLayout(width: number, idealSceneH: number, mobile: boolean): HeroLayout {
  if (mobile) return 'stack';
  const sceneH = Math.max(idealSceneH, MIN_OVERLAY_SCENE_H);
  return placeOverlaySprite(width, sceneH) === null ? 'stack' : 'overlay';
}

/** Integer placement of the forest and Roy for a scene `width` x `height` px. */
export function computeHeroScene(layout: HeroLayout, width: number, height: number): HeroScene {
  const w = Math.max(1, Math.round(width));
  let k: number;
  let sceneH: number;
  let spriteX: number;
  let hudClear = true;

  if (layout === 'overlay') {
    sceneH = Math.max(1, Math.round(height));
    k = sceneScale(w, sceneH);
    // A scene taller than planned (a very tall card) may leave no stage: hug the right edge.
    const placed = placeOverlaySprite(w, sceneH);
    spriteX = placed?.spriteX ?? w - EDGE_AIR - WAVE.frameW * k;
    hudClear = (placed ? placed.hudClear : !hitsHud(spriteX, k, w, sceneH)) && hudBesideCard(w);
  } else {
    // x3 on phones; portrait tablets get x4. Roy's frame is centred at 60% of the width.
    k = w < 768 ? HERO_MOBILE_K : HERO_MOBILE_K + 1;
    sceneH = FOREST.h * k;
    spriteX = Math.round(0.6 * w - (WAVE.frameW * k) / 2);
  }

  // Keep the forest covering the scene. The band crops a single copy whenever it is wide
  // enough; the desktop placement above already weighed mirrored copies against the birds.
  const forestW = FOREST.w * k;
  const cropOnly = layout === 'stack' && forestW >= w;
  const [minX, maxX] = cropOnly ? [w - forestW, 0] : [w - 2 * forestW, forestW];
  const forestX = Math.min(maxX, Math.max(minX, forestXFor(spriteX, k)));
  const forestY = forestYFor(k, sceneH);

  return {
    layout,
    k,
    sceneH,
    forestX,
    forestY,
    groundExtraH: Math.max(0, sceneH - forestY - FOREST.h * k),
    mirrorLeft: forestX > 0,
    mirrorRight: forestX + forestW < w,
    spriteX: forestX + (HERO_FEET_COLUMN - WAVE.anchorX) * k,
    groundH: groundHFor(k, sceneH),
    dirtH: sceneH - forestY - DIRT_ROW * k,
    hudClear,
  };
}

/**
 * Whole-pixel top offset of the title card inside the scene: centred in the air above the
 * grass, never closer than 16px to the top, and allowed to overlap the ground (never the
 * scene bottom) when the scene is short. Integer so the pixel type stays on the pixel grid.
 */
export function titleCardTop(sceneH: number, groundH: number, cardH: number): number {
  const centred = Math.round((sceneH - groundH - cardH) / 2);
  const lowest = sceneH - CARD_BOTTOM_AIR - CARD_DROP - cardH;
  return Math.max(CARD_TOP_MIN, Math.min(centred, lowest));
}

/* ── Hooks ─────────────────────────────────────────────────────────────── */

function useElementSize(ref: RefObject<HTMLElement>): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize(prev => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function useViewportHeight(): number {
  const [vh, setVh] = useState(() => window.innerHeight || 800);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight || 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vh;
}

/** True while the element is (near) the viewport and the tab is visible. */
function useSpriteRunning(ref: RefObject<HTMLElement>, enabled: boolean): boolean {
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => setInView(entries.some(e => e.isIntersecting)), {
      rootMargin: '64px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, ref]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [enabled]);

  return inView && pageVisible;
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/**
 * Roy waving at any integer scale. `Character` stops at x4; the title screen needs the
 * forest's scale (x5 to x7 on common desktops), so this draws the same `wave` sheet the same way
 * (Character.css: stepped frames, paused off-screen / in hidden tabs, frame 0 under reduced
 * motion).
 */
function HeroSprite({ scale, label, paused }: { scale: number; label: string; paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const running = useSpriteRunning(ref, !paused);
  const sheetW = WAVE.frameW * WAVE.frames * scale;
  const style = {
    width: `${WAVE.frameW * scale}px`,
    height: `${WAVE.frameH * scale}px`,
    backgroundImage: `url(${WAVE.src})`,
    backgroundSize: `${sheetW}px ${WAVE.frameH * scale}px`,
    '--px-frames': String(WAVE.frames),
    '--px-duration': `${WAVE.frames * WAVE.frameMs}ms`,
    '--px-sheet-end': `-${sheetW}px`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      data-pose="wave"
      className={cx('px-character px-character--animated', (paused || !running) && 'px-character--paused')}
      style={style}
    />
  );
}

/** Horizontal shift (native columns) of each repeated dirt strip, so no two line up. */
const GROUND_STRIP_SHIFTS = [0, 97, 53, 181, 29, 139, 211, 71];

/**
 * Deeper ground: the forest's bottom four dirt rows repeated down to the scene bottom, each
 * strip shifted sideways so the repeats read as layered earth rather than a pattern.
 */
function GroundStrips({
  k,
  forestX,
  top,
  depth,
}: {
  k: number;
  forestX: number;
  top: number;
  depth: number;
}) {
  const stripH = GROUND_STRIP_ROWS * k;
  const count = Math.ceil(depth / stripH);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="pixelated absolute inset-x-0 bg-repeat-x"
          style={{
            top: `${top + i * stripH}px`,
            height: `${stripH}px`,
            backgroundImage: `url(${FOREST.src})`,
            backgroundSize: `${FOREST.w * k}px ${FOREST.h * k}px`,
            backgroundPosition: `${forestX - GROUND_STRIP_SHIFTS[i % GROUND_STRIP_SHIFTS.length] * k}px ${
              -(FOREST.h - GROUND_STRIP_ROWS) * k
            }px`,
          }}
        />
      ))}
    </>
  );
}

function Meter({
  label,
  filled,
  fillClass,
  end,
}: {
  label: string;
  filled: number;
  fillClass: string;
  end: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 text-hud">
      <span className="w-5 text-fg-muted">{label}</span>
      <span className="flex gap-[2px]">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={cx('block h-[10px] w-[6px]', i < filled ? fillClass : 'bg-surface-sunken')} />
        ))}
      </span>
      {end}
    </span>
  );
}

/** Player nameplate, top-right of the scene. Decorative except its screen-reader line. */
function HudNameplate() {
  return (
    <PixelPanel variant="wood" padding="sm" elevation={1} className="pointer-events-auto">
      {/* Fixed tracks (57px = the face well) keep every label on whole pixels. */}
      <div aria-hidden="true" className="grid grid-cols-[46px_148px] grid-rows-[17px_20px_20px] items-end gap-x-3">
        <span className="row-span-3 block self-stretch bg-surface-sunken p-1">
          <img
            src={pixelSprites.face.src}
            alt=""
            width={pixelSprites.face.w}
            height={pixelSprites.face.h}
            className="pixelated block"
          />
        </span>
        <span className="text-label text-accent-fg">Player 1</span>
        <Meter label="HP" filled={8} fillClass="bg-hp" end={<span className="text-fg">MAX</span>} />
        <Meter
          label="XP"
          filled={5}
          fillClass="bg-xp"
          end={
            <span className="text-fg" title="3rd year">
              LVL 3
            </span>
          }
        />
      </div>
      <span className="sr-only">Level 3: third-year student</span>
    </PixelPanel>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

/**
 * The title screen of Roy Runner: the game's forest at an integer scale, Roy waving on
 * its grass line at the same pixel scale, a title card (name, role, tagline, availability,
 * CTAs, Press start) and a player HUD. Press start (or the navbar's `arcade:play` event) fades
 * the title card out and runs the lazily loaded mini-game over the same scene; a phone held
 * upright gets the rotate prompt instead.
 */
export default function Hero() {
  const [isPlaying, setIsPlaying] = useState(false);
  const isMobile = useIsMobile();
  const mode = useGameDisplayMode();
  const reduced = usePrefersReducedMotion();

  const sceneRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const pressStartRef = useRef<HTMLButtonElement>(null);
  const wasPlaying = useRef(false);

  const measured = useElementSize(sceneRef);
  const vh = useViewportHeight();
  const width = measured?.w || document.documentElement.clientWidth || window.innerWidth;
  const idealH = Math.min(vh, HERO_MAX_H) - HERO_NAV_H;
  const layout = chooseHeroLayout(width, idealH, isMobile);
  const overlay = layout === 'overlay';
  const scene = computeHeroScene(layout, width, Math.max(idealH, measured?.h ?? 0));
  const { k } = scene;
  const forestTiles = [
    scene.mirrorLeft && { x: scene.forestX - FOREST.w * k, mirrored: true },
    { x: scene.forestX, mirrored: false },
    scene.mirrorRight && { x: scene.forestX + FOREST.w * k, mirrored: true },
  ].filter((tile): tile is { x: number; mirrored: boolean } => Boolean(tile));
  const cardH = useElementSize(cardRef)?.h || CARD_H_ESTIMATE;
  const cardTop = titleCardTop(scene.sceneH, scene.groundH, cardH);
  // The scroll cue sits in the dirt at the bottom centre; skip it when the card reaches down there.
  const showScrollCue = overlay && cardTop + cardH + CARD_DROP <= scene.sceneH - scene.dirtH;

  useEffect(() => {
    const handler = () => setIsPlaying(true);
    window.addEventListener('arcade:play', handler);
    return () => window.removeEventListener('arcade:play', handler);
  }, []);

  // Lock body scroll while the game is open so taps don't bleed into page scroll.
  useEffect(() => {
    if (!isPlaying) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPlaying]);

  const quit = useCallback(() => setIsPlaying(false), []);

  // Esc quits in every mode (the rotate prompt has no game to catch it).
  useEffect(() => {
    if (!isPlaying) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') quit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, quit]);

  // The faded-out title card and HUD leave the tab order; focus follows the scene swap.
  useLayoutEffect(() => {
    for (const el of [titleRef.current, hudRef.current]) {
      if (el) el.inert = isPlaying;
    }
    if (isPlaying) {
      gameRef.current?.focus({ preventScroll: true });
    } else if (wasPlaying.current) {
      pressStartRef.current?.focus({ preventScroll: true });
    }
    wasPlaying.current = isPlaying;
  }, [isPlaying]);

  const sceneTransition: Transition = reduced
    ? { duration: 0 }
    : { duration: seconds(duration.scene), ease: ease.scene };
  // Slides move in whole 4px steps; only the fade is smooth.
  const slide = (distance: number): Transition => {
    if (reduced) return { duration: 0 };
    const stepped = { duration: seconds(duration.scene), ease: steps(distance / 4) };
    return { ...sceneTransition, x: stepped, y: stepped };
  };

  const spriteLabel = 'Roy waving hello';

  const titleCard = (
    <div ref={cardRef} className={overlay ? 'w-[544px] max-w-full' : undefined}>
      <PixelPanel
        variant="wood"
        elevation={overlay ? 2 : 0}
        className={overlay ? undefined : 'w-full px-4 pb-10 pt-6 md:px-6 md:pt-8'}
      >
        <div className={overlay ? undefined : 'mx-auto max-w-[544px] md:mx-0'}>
          <p className="flex items-center gap-2 text-label text-accent-fg">
            <PixelIcon name="play" size={12} />
            Player one
          </p>
          <h1 id="hero-title" className="mt-3 text-display-xl text-fg">
            {splitName(bio.name)}
          </h1>
          <p className="mt-2 text-body-l font-semibold text-accent-fg">{bio.role}</p>
          <p className="mt-3 text-pretty text-body-l text-fg">{bio.tagline}</p>
          <div className="mt-4 flex">
            <Chip className="gap-2">
              <span aria-hidden="true" className="block size-2 bg-xp" />
              {bio.availability}
            </Chip>
          </div>
          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            <Button
              href="#projects"
              size="lg"
              className="w-full md:w-auto"
              leadingIcon={<PixelIcon name="play" size={24} />}
            >
              View projects
            </Button>
            <Button
              href={bio.resume.href}
              download={bio.resume.fileName}
              variant="secondary"
              size="lg"
              className="w-full md:w-auto"
              leadingIcon={<PixelIcon name="download" size={24} />}
            >
              Resume
            </Button>
          </div>
          <Button
            ref={pressStartRef}
            variant="ghost"
            className="mt-4"
            onClick={() => setIsPlaying(true)}
            leadingIcon={<PixelIcon name="joystick" size={24} />}
          >
            Press start to play
          </Button>
        </div>
      </PixelPanel>
    </div>
  );

  const gameClass =
    mode === 'touch'
      ? 'fixed inset-0 z-[200] flex items-center justify-center bg-bg'
      : mode === 'rotate'
        ? 'px-dots fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-bg px-4'
        : 'absolute inset-x-0 bottom-0 top-16 z-20 flex flex-col items-center justify-center gap-6 bg-shadow/70 px-4';

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      data-layout={layout}
      className={cx(
        'relative bg-bg pt-16',
        overlay ? 'flex min-h-[min(100svh,880px)] flex-col overflow-hidden' : 'overflow-x-clip pb-1',
      )}
    >
      {/* ── The world: forest + Roy at one integer scale ─────────────────── */}
      <div
        ref={sceneRef}
        className={cx('hero-scene overflow-hidden', overlay ? 'absolute inset-x-0 bottom-0 top-16' : 'relative')}
        style={overlay ? undefined : { height: `${scene.sceneH}px` }}
      >
        {forestTiles.map(tile => (
          <img
            key={tile.x}
            src={FOREST.src}
            alt=""
            width={FOREST.w * k}
            height={FOREST.h * k}
            decoding="async"
            draggable={false}
            className={cx('pixelated absolute max-w-none select-none', tile.mirrored && '-scale-x-100')}
            style={{
              left: `${tile.x}px`,
              top: `${scene.forestY}px`,
              width: `${FOREST.w * k}px`,
              height: `${FOREST.h * k}px`,
            }}
          />
        ))}
        {scene.groundExtraH > 0 && (
          <GroundStrips
            k={k}
            forestX={scene.forestX}
            top={scene.forestY + FOREST.h * k}
            depth={scene.groundExtraH}
          />
        )}
        {/* Night: the world gets two moonlight washes, Roy (between them) one, so he stays lit. */}
        <div aria-hidden="true" className="hero-night-wash pointer-events-none absolute inset-0" />
        <motion.div
          className="absolute"
          style={{ left: `${scene.spriteX}px`, bottom: `${scene.groundH}px` }}
          initial={false}
          animate={{ opacity: isPlaying ? 0 : 1 }}
          transition={sceneTransition}
        >
          {k <= 4 ? (
            <Character pose="wave" scale={k} label={spriteLabel} />
          ) : (
            <HeroSprite scale={k} label={spriteLabel} paused={isPlaying} />
          )}
        </motion.div>
        <div aria-hidden="true" className="hero-night-wash pointer-events-none absolute inset-0" />
      </div>

      {/* ── HUD nameplate (desktop) ─────────────────────────────────────── */}
      {overlay && scene.hudClear && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10">
          <div className="mx-auto flex max-w-[1120px] justify-end px-6 pt-4 lg:px-8">
            <motion.div
              ref={hudRef}
              initial={false}
              animate={isPlaying ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
              transition={slide(16)}
            >
              <HudNameplate />
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Title card ──────────────────────────────────────────────────── */}
      <motion.div
        ref={titleRef}
        className={cx(
          'relative z-10',
          overlay && 'mx-auto w-full max-w-[1120px] flex-1 px-6 pb-9 lg:px-8',
        )}
        style={overlay ? { paddingTop: `${cardTop}px` } : undefined}
        initial={false}
        animate={isPlaying ? { opacity: 0, x: -24 } : { opacity: 1, x: 0 }}
        transition={slide(24)}
      >
        {titleCard}
      </motion.div>

      {/* ── Scroll cue (desktop), on the dirt under the grass ───────────── */}
      {showScrollCue && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-center gap-2 text-hud text-fg"
          style={{ bottom: `${Math.round((scene.dirtH - 16) / 2)}px` }}
          initial={false}
          animate={{ opacity: isPlaying ? 0 : 1 }}
          transition={sceneTransition}
        >
          SCROLL
          <PixelIcon name="arrow-down" size={12} />
        </motion.div>
      )}

      {/* ── Game / rotate prompt ────────────────────────────────────────── */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            key="game"
            ref={gameRef}
            tabIndex={-1}
            role="region"
            aria-label="Roy Runner"
            className={cx(gameClass, 'outline-none')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={sceneTransition}
          >
            {mode === 'rotate' ? (
              <ArcadeFallback />
            ) : (
              <Suspense fallback={<p className="text-label text-fg">Loading...</p>}>
                <MiniGame onQuit={quit} showTouchControls={mode === 'touch'} />
              </Suspense>
            )}

            {/* Touch play has its own QUIT inside the game chrome. */}
            {mode !== 'touch' && (
              <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={quit} leadingIcon={<PixelIcon name="close" size={12} />}>
                  Quit
                </Button>
                {mode === 'desktop' && (
                  <Chip>
                    <kbd className="font-[inherit]">Esc</kbd>
                  </Chip>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** "Roy Carmelli" → first name and surname on their own lines (the H1 text stays "Roy Carmelli"). */
function splitName(name: string): ReactNode {
  const [first, ...rest] = name.split(' ');
  if (rest.length === 0) return name;
  return (
    <>
      <span className="block">{first}</span> <span className="block">{rest.join(' ')}</span>
    </>
  );
}
