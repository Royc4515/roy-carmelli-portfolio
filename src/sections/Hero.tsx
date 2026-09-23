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
import { AnimatePresence, LazyMotion, domAnimation, m, steps, type Transition } from 'framer-motion';
import { bio } from '../data/bio';
import Character from '../components/Character';
import ArcadeFallback from '../components/ArcadeFallback';
import PixelPanel from '../components/PixelPanel';
import PixelIcon from '../components/PixelIcon';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { useToast } from '../components/ui/Toast';
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

   Title screen (desktop): k = max(ceil(W / 240), floor(H / 112)), one step
   under "cover", so Roy stays about 55% of the scene and the canopy, birds and
   fences stay in view. A forest shorter than the scene is anchored to the top
   and the ground gets deeper: its bottom dirt rows repeat, shifted per strip,
   down to the scene bottom. A forest taller than the scene is anchored to the
   bottom (the canopy crops). When covering the width would push Roy past 60%
   of the scene (1920x1080 under the 880px cap, ultrawide, short windows) k
   stays at floor(H / 112) and mirrored copies of the forest, seamless at the
   shared edge, fill the sides.

   Compact title screen (short or narrow landscape viewports: phones held
   sideways, 200% zoom, small windows): the same composition, but k is chosen
   so the forest fills the first screen and Roy stands in it whole, and the
   card may narrow; the card's content puts the CTAs right under the role.

   Band (phones and portrait tablets): the forest as a strip above the title
   card, x3 on phones, x4 on tablets, x2 when the viewport is under 700px tall,
   at most 38% of the viewport tall (the canopy crops, Roy and the grass stay). */

const FOREST = pixelSprites.forest;
const WAVE = pixelSprites.wave;

/** Forest column Roy's feet stand on. */
export const HERO_FEET_COLUMN = 182;
/** Fixed navbar height; the scene starts below it. */
export const HERO_NAV_H = 64;
/** The hero is at most this tall (nav included)... */
export const HERO_MAX_H = 880;
/** ...unless the viewport is less than this much taller: then it fills it (no sliver of Zone 01). */
export const HERO_FILL_SLACK = 96;
/** Title-card width on the scene (fits the two lg CTAs, 476px, side by side at p-5). */
export const HERO_CARD_W = 520;
/** Scale of the band on phones. */
export const HERO_MOBILE_K = 3;
/** Roy's sprite may take at most this share of the desktop scene height. */
export const HERO_MAX_SHARE = 0.6;
/** The band takes at most this share of the viewport height (the canopy crops first). */
export const HERO_BAND_SHARE = 0.38;
/** Viewports shorter than this get the band at x2. */
export const HERO_SHORT_VH = 700;
/**
 * Viewports at least this tall show the full-width title card in its reading order: its CTAs end
 * 524px down (nav, 16px, the card down to the CTA's drop). Shorter ones move the CTAs up.
 */
export const HERO_FULL_CARD_VH = 560;
/**
 * First screens (scene area under the nav) shorter than this get the tight title card: the
 * name on one 32px line, a 16px tagline, 16px padding, tighter rhythm. Laptops at 150-175%
 * Windows scaling with the browser's tabs and bookmarks bar show 450-540px here.
 */
export const HERO_TIGHT_SCENE_H = 560;
/** The one-line 32px name needs this much card width (12 glyphs x 32px + 16px padding each side). */
const TIGHT_NAME_CARD_W = 416;

/** True when the overlay title card should use its tight density for a viewport `vh` px tall. */
export function isTightCard(vh: number, cardW: number): boolean {
  return heroHeight(vh) - HERO_NAV_H < HERO_TIGHT_SCENE_H && cardW >= TIGHT_NAME_CARD_W;
}

/** Native rows the band always keeps: Roy (67), the ground under his feet (11) and 4 rows of air. */
export const HERO_BAND_MIN_ROWS = FOREST.h - FOREST.groundRow + WAVE.frameH + 4;
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
const CARD_H_ESTIMATE = 456;
/**
 * Narrowest compact card: the H1's longest line ("Carmelli", 8 glyphs) plus the card's padding,
 * below 768px (32px type, p-4) and from 768px (40px type, p-5).
 */
const CARD_MIN_W = 288;
const CARD_MIN_W_MD = 360;
/** The HUD nameplate: 16px below the scene top, its box 266x89 plus a 4px frame and 8px drop. */
const HUD_TOP = 16;
const HUD_W = 266;
const HUD_H = 89;
/** Placement costs (px of distance from the ideal spot are worth 1). */
const COST_COLLISION = 1000;
const COST_OPTIONAL_MIRROR = 300;

export type HeroLayout =
  /** Scene fills the hero; card and HUD float over it (desktop, landscape). */
  | 'overlay'
  /** Scene is a band; the card flows below it (phones, portrait tablets). */
  | 'stack';

export interface HeroPlan {
  layout: HeroLayout;
  /** Overlay on a short or narrow landscape viewport (see `compactOverlayFit`). */
  compact: boolean;
}

export interface HeroScene {
  layout: HeroLayout;
  /** Integer scale shared by the forest and Roy. */
  k: number;
  /** Scene height in px (stack: the band). */
  sceneH: number;
  /** Title-card width in px (overlay). */
  cardW: number;
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
  /** Overlay: the HUD nameplate has room above Roy's head and beside the card. */
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
 * Height of the hero (nav included) in a viewport `vh` px tall: the viewport, capped at 880px,
 * except that a viewport 1-95px taller than the cap is filled, so no sliver of Zone 01 shows
 * under the title screen. Mirrors `.hero--overlay` in Hero.css.
 */
export function heroHeight(vh: number): number {
  return vh > HERO_MAX_H && vh < HERO_MAX_H + HERO_FILL_SLACK ? vh : Math.min(vh, HERO_MAX_H);
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

/** True when Roy's sprite (left `spriteX`, top `spriteTop`) would touch the HUD nameplate (8px air). */
function hitsHud(spriteX: number, spriteTop: number, k: number, width: number): boolean {
  const air = 8;
  const hudRight = width - containerContentLeft(width);
  const hudL = hudRight - HUD_W - 4 - air; // frame, air
  const hudR = hudRight + 4 + 4 + air; // frame, drop, air
  const hudBottom = HUD_TOP + HUD_H + 4 + 8 + air; // frame, drop, air
  return spriteTop < hudBottom && spriteX < hudR && spriteX + WAVE.frameW * k > hudL;
}

/** True when the HUD nameplate clears the title card's right edge by 16px. */
function hudBesideCard(width: number, cardW: number): boolean {
  const left = containerContentLeft(width);
  return width - left - HUD_W - 4 >= left + cardW + CARD_OUTSET + 16;
}

export interface OverlayPlacement {
  /** Roy's sprite left edge, whole px. */
  spriteX: number;
  /** False when no position keeps Roy clear of the HUD: the HUD is then left out. */
  hudClear: boolean;
  /** No bird sliced by the card and Roy clear of the HUD. */
  clean: boolean;
}

/** Scale, card width and Roy's top edge for one overlay composition. */
interface Stage {
  k: number;
  cardW: number;
  spriteTop: number;
  /** Keep Roy clear of the HUD nameplate (default true). */
  hud?: boolean;
}

/**
 * Places Roy's sprite beside a card `stage.cardW` wide, or returns null when he does not fit.
 * Ideal: centred between the card and the container's right edge (under the HUD), or hugging
 * the right gutter when that stage is too narrow. Every whole pixel of the allowed range is then
 * scored: distance from the ideal, plus a heavy cost if the card's edge would slice a bird or
 * Roy's head would touch the HUD, plus a cost for showing a mirrored forest copy that a plain
 * crop would not need.
 */
function placeSprite(width: number, { k, cardW, spriteTop, hud: withHud = true }: Stage): OverlayPlacement | null {
  const spriteW = WAVE.frameW * k;
  const forestW = FOREST.w * k;
  const left = containerContentLeft(width);
  const cardEdge = left + cardW + CARD_OUTSET;
  const lo = cardEdge + STAGE_AIR;
  const hi = width - EDGE_AIR - spriteW;
  if (hi < lo) return null;

  const stageR = width - left;
  const ideal = stageR - lo >= spriteW ? lo + (stageR - lo - spriteW) / 2 : hi;
  const cropOnly = forestW >= width;

  let best = { spriteX: Math.round(ideal), hudClear: true, clean: false };
  let bestCost = Infinity;
  for (let x = lo; x <= hi; x += 1) {
    const forestX = forestXFor(x, k);
    // Mirrored copies can fill at most one forest width per side.
    if (forestX > forestW || forestX + 2 * forestW < width) continue;
    const mirrored = forestX > 0 || forestX + forestW < width;
    const hud = withHud && hitsHud(x, spriteTop, k, width);
    const birds = birdsClear(forestX, k, cardEdge);
    const cost =
      Math.abs(x - ideal) +
      (birds ? 0 : COST_COLLISION) +
      (hud ? COST_COLLISION : 0) +
      (mirrored && cropOnly ? COST_OPTIONAL_MIRROR : 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = { spriteX: x, hudClear: !hud, clean: birds && !hud };
    }
  }
  return best;
}

/** Roy's top edge in a scene whose forest top is at `forestY`. */
function spriteTopFor(k: number, forestY: number): number {
  return forestY + (FOREST.groundRow - WAVE.frameH) * k;
}

/**
 * Desktop placement of Roy's sprite in a `width` x `sceneH` title screen (544px card, scale
 * `sceneScale`), or null when he does not fit beside the title card.
 */
export function placeOverlaySprite(width: number, sceneH: number): OverlayPlacement | null {
  const k = sceneScale(width, sceneH);
  return placeSprite(width, { k, cardW: HERO_CARD_W, spriteTop: spriteTopFor(k, forestYFor(k, sceneH)) });
}

/** Width left for the title card when Roy stands beside it at scale k. */
function cardRoom(width: number, k: number): number {
  return width - containerContentLeft(width) - CARD_OUTSET - STAGE_AIR - WAVE.frameW * k - EDGE_AIR;
}

export interface CompactFit {
  k: number;
  cardW: number;
}

/**
 * Roy's placement in a compact title screen whose first screen is `viewH` px tall. The HUD is a
 * bonus there: it shows only where Roy's head leaves it room, it never moves him.
 */
function placeCompact(width: number, viewH: number, { k, cardW }: CompactFit): OverlayPlacement | null {
  return placeSprite(width, { k, cardW, spriteTop: spriteTopFor(k, forestYFor(k, viewH)), hud: false });
}

/**
 * Compact title screen for a viewport whose scene area is `viewH` px tall: the scale whose forest
 * best fills the first screen (Roy whole, with 4 rows of air over his head), stepping down one
 * scale to keep the full 544px card, else narrowing the card (widest first, never under its
 * minimum). The first candidate where the card slices no bird wins. Null when nothing fits: the
 * band layout takes over.
 */
export function compactOverlayFit(width: number, viewH: number): CompactFit | null {
  const kFit = Math.min(Math.round(viewH / FOREST.h), Math.floor(viewH / HERO_BAND_MIN_ROWS));
  const kTop = Math.max(2, kFit);
  const minCard = width >= 768 ? CARD_MIN_W_MD : CARD_MIN_W;
  const candidates: CompactFit[] = [];
  for (let k = kTop; k >= Math.max(2, kTop - 1); k -= 1) {
    if (cardRoom(width, k) >= HERO_CARD_W) candidates.push({ k, cardW: HERO_CARD_W });
  }
  for (let k = kTop; k >= 2; k -= 1) {
    for (let cardW = Math.min(HERO_CARD_W, Math.floor(cardRoom(width, k) / 4) * 4); cardW >= minCard; cardW -= 4) {
      candidates.push({ k, cardW });
    }
  }
  let fallback: CompactFit | null = null;
  for (const fit of candidates) {
    const placed = placeCompact(width, viewH, fit);
    if (!placed) continue;
    if (placed.clean) return fit;
    fallback ??= fit;
  }
  return fallback;
}

/**
 * Card-driven minimum scene height: a scene shorter than the card plus its margins would push
 * the CTAs below the fold, so it gets the compact title screen instead.
 */
const MIN_OVERLAY_SCENE_H = CARD_TOP_MIN + CARD_H_ESTIMATE + CARD_DROP + CARD_BOTTOM_AIR;

/**
 * Layout for a viewport `width` x `viewportH`, decided from the viewport only (never from the
 * measured scene) so the choice cannot oscillate:
 * - the title screen when the viewport is ≥ 768px wide, tall enough for the card and Roy fits
 *   beside it at the scene scale;
 * - otherwise, in landscape, the compact title screen when it fits;
 * - otherwise the band layout.
 */
export function planHero(width: number, viewportH: number, mobile: boolean): HeroPlan {
  const viewH = heroHeight(viewportH) - HERO_NAV_H;
  const short = viewH < MIN_OVERLAY_SCENE_H;
  if (!mobile && !short && placeOverlaySprite(width, viewH) !== null) {
    return { layout: 'overlay', compact: false };
  }
  if (width > viewportH && compactOverlayFit(width, viewH) !== null) {
    return { layout: 'overlay', compact: true };
  }
  return { layout: 'stack', compact: false };
}

/** `planHero`'s layout for a scene area `idealH` px tall (the viewport minus the nav). */
export function chooseHeroLayout(width: number, idealH: number, mobile: boolean): HeroLayout {
  return planHero(width, idealH + HERO_NAV_H, mobile).layout;
}

export interface SceneOptions {
  /** Viewport height: sizes the band (stack) and the first screen (compact). */
  viewportH?: number;
  /** Compact title screen (see `planHero`). */
  compact?: boolean;
}

/** Integer placement of the forest and Roy for a scene `width` x `height` px. */
export function computeHeroScene(
  layout: HeroLayout,
  width: number,
  height: number,
  { viewportH, compact = false }: SceneOptions = {},
): HeroScene {
  const w = Math.max(1, Math.round(width));
  let k: number;
  let sceneH: number;
  let forestY: number;
  let spriteX: number;
  let cardW = HERO_CARD_W;
  let hudClear = false;

  if (layout === 'overlay') {
    sceneH = Math.max(1, Math.round(height));
    if (compact) {
      // Fit the first screen: the scene may be taller (the card grows it), the forest is
      // anchored to the first screen and the dirt deepens below.
      const viewH = viewportH === undefined ? sceneH : Math.min(sceneH, heroHeight(viewportH) - HERO_NAV_H);
      const fit = compactOverlayFit(w, viewH) ?? { k: 2, cardW: CARD_MIN_W };
      ({ k, cardW } = fit);
      forestY = forestYFor(k, viewH);
    } else {
      k = sceneScale(w, sceneH);
      forestY = forestYFor(k, sceneH);
    }
    const spriteTop = spriteTopFor(k, forestY);
    // A scene taller than planned (a very tall card) may leave no stage: hug the right edge.
    const placed = placeSprite(w, { k, cardW, spriteTop, hud: !compact });
    spriteX = placed?.spriteX ?? w - EDGE_AIR - WAVE.frameW * k;
    hudClear = !hitsHud(spriteX, spriteTop, k, w) && hudBesideCard(w, cardW);
  } else {
    // x3 on phones, x4 on portrait tablets, x2 on short viewports. Roy's frame is centred at
    // 60% of the width. The band keeps the forest's bottom rows (Roy, grass, dirt) and crops
    // the canopy down to HERO_BAND_SHARE of the viewport.
    const short = viewportH !== undefined && viewportH < HERO_SHORT_VH;
    k = short ? 2 : w < 768 ? HERO_MOBILE_K : HERO_MOBILE_K + 1;
    const rows =
      viewportH === undefined
        ? FOREST.h
        : Math.min(FOREST.h, Math.max(HERO_BAND_MIN_ROWS, Math.floor((HERO_BAND_SHARE * viewportH) / k)));
    sceneH = rows * k;
    forestY = sceneH - FOREST.h * k;
    spriteX = Math.round(0.6 * w - (WAVE.frameW * k) / 2);
  }

  // Keep the forest covering the scene. The band crops a single copy whenever it is wide
  // enough; the desktop placement above already weighed mirrored copies against the birds.
  const forestW = FOREST.w * k;
  const cropOnly = layout === 'stack' && forestW >= w;
  const [minX, maxX] = cropOnly ? [w - forestW, 0] : [w - 2 * forestW, forestW];
  const forestX = Math.min(maxX, Math.max(minX, forestXFor(spriteX, k)));

  return {
    layout,
    k,
    sceneH,
    cardW,
    forestX,
    forestY,
    groundExtraH: Math.max(0, sceneH - forestY - FOREST.h * k),
    mirrorLeft: forestX > 0,
    mirrorRight: forestX + forestW < w,
    spriteX: forestX + (HERO_FEET_COLUMN - WAVE.anchorX) * k,
    groundH: sceneH - forestY - FOREST.groundRow * k,
    dirtH: sceneH - forestY - DIRT_ROW * k,
    hudClear,
  };
}

/**
 * Whole-pixel top offset of the title card inside the scene. With the HUD on screen the card's
 * top lines up with the HUD's (16px under the scene top); otherwise it is centred in the air
 * above the grass, never closer than 16px to the top, and allowed to overlap the ground (never
 * the scene bottom) when the scene is short. Integer so the pixel type stays on the pixel grid.
 */
export function titleCardTop(sceneH: number, groundH: number, cardH: number, pinned = false): number {
  if (pinned) return CARD_TOP_MIN;
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

/**
 * While the game is open, the rest of the page (main's other sections and the footer) leaves
 * the tab order and the accessibility tree; quitting restores exactly what it changed.
 */
function useInertPageWhile(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const others = [
      ...document.querySelectorAll<HTMLElement>('main > :not(#hero)'),
      ...document.querySelectorAll<HTMLElement>('main ~ footer'),
    ].filter(el => !el.hasAttribute('inert'));
    others.forEach(el => el.setAttribute('inert', ''));
    return () => others.forEach(el => el.removeAttribute('inert'));
  }, [active]);
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

/** Eight 8x12 segments 4px apart: the meter sits on the 4px grid. */
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
      <span className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            data-meter-segment=""
            className={cx('block h-3 w-2', i < filled ? fillClass : 'bg-surface-sunken')}
          />
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
      {/* Fixed tracks (46px = the face well) keep every label on whole pixels. */}
      <div aria-hidden="true" className="grid grid-cols-[46px_176px] grid-rows-[17px_20px_20px] items-end gap-x-3">
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

/** Desktop game controls, next to Esc: HTML so they stay crisp at any zoom. */
function ControlsHint() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-hud text-fg-muted">
      <Chip>
        <kbd className="font-[inherit]">Space</kbd>
      </Chip>
      <span>/ click to jump</span>
      <span aria-hidden="true">·</span>
      <Chip>
        <kbd className="flex items-center font-[inherit]">
          <PixelIcon name="arrow-down" size={12} />
          <span className="sr-only">Down arrow</span>
        </kbd>
      </Chip>
      <span>to slide</span>
    </p>
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
  const toast = useToast();

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
  const idealH = heroHeight(vh) - HERO_NAV_H;
  const { layout, compact } = planHero(width, vh, isMobile);
  const overlay = layout === 'overlay';
  const scene = computeHeroScene(layout, width, Math.max(idealH, measured?.h ?? 0), {
    viewportH: vh,
    compact,
  });
  const { k } = scene;
  const forestTiles = [
    scene.mirrorLeft && { x: scene.forestX - FOREST.w * k, mirrored: true },
    { x: scene.forestX, mirrored: false },
    scene.mirrorRight && { x: scene.forestX + FOREST.w * k, mirrored: true },
  ].filter((tile): tile is { x: number; mirrored: boolean } => Boolean(tile));
  const cardH = useElementSize(cardRef)?.h || CARD_H_ESTIMATE;
  const cardTop = titleCardTop(scene.sceneH, scene.groundH, cardH, scene.hudClear);
  // The scroll cue sits in the dirt at the bottom centre; skip it when the card reaches down there.
  const showScrollCue = overlay && cardTop + cardH + CARD_DROP <= scene.sceneH - scene.dirtH;

  // Press start and the navbar's Play (`arcade:play`) both open the game here. It opens inside
  // the hero and the page scroll then locks, so the hero must be at the top of the viewport
  // first: jump there (a page scrolled past the title card, a Play scroll cut short).
  const startGame = useCallback(() => {
    const top = document.getElementById('hero')?.getBoundingClientRect().top ?? 0;
    if (Math.abs(top) > 1) window.scrollTo({ top: window.scrollY + top, behavior: 'instant' });
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    window.addEventListener('arcade:play', startGame);
    return () => window.removeEventListener('arcade:play', startGame);
  }, [startGame]);

  // Lock body scroll while the game is open so taps don't bleed into page scroll.
  useEffect(() => {
    if (!isPlaying) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPlaying]);

  useInertPageWhile(isPlaying);

  const quit = useCallback(() => setIsPlaying(false), []);

  // An in-page link outside the hero (the nav stays usable during play) leaves the game
  // first, so the page it jumps to is no longer inert; focus stays on that link.
  const leftViaLink = useRef(false);
  useEffect(() => {
    if (!isPlaying) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link || link.closest('#hero')) return;
      leftViaLink.current = true;
      quit();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isPlaying, quit]);

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
      el?.toggleAttribute('inert', isPlaying);
    }
    if (isPlaying) {
      gameRef.current?.focus({ preventScroll: true });
    } else if (wasPlaying.current && !leftViaLink.current) {
      pressStartRef.current?.focus({ preventScroll: true });
    }
    leftViaLink.current = false;
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

  /* ── Title card ─────────────────────────────────────────────────────────
     One set of pieces, three arrangements:
     - title screen (and a compact one with the full card at least 560px tall): eyebrow, name,
       role, tagline, availability, CTAs, Press start;
     - shorter compact title screens: the CTAs move up under the role so they make the fold;
     - band (phones): eyebrow, name, role, availability, CTAs, tagline, Press start;
       from 768px the CTAs and Press start take a second column beside the text. */
  const fullCard = overlay && scene.cardW >= HERO_CARD_W;
  const tight = overlay && isTightCard(vh, scene.cardW);
  const titleOrder = overlay && fullCard && !tight && (!compact || vh >= HERO_FULL_CARD_VH);
  const wideBand = !overlay && width >= 768;

  const eyebrow = (
    <p className="flex items-center gap-2 text-label text-accent-fg">
      <PixelIcon name="play" size={12} />
      Player one
    </p>
  );
  const name = (
    <h1 id="hero-title" className={cx('text-display-xl text-fg', tight ? 'hero-name--tight mt-2' : 'mt-3')}>
      {splitName(bio.name)}
    </h1>
  );
  const role = (
    <p className={cx('font-semibold text-accent-fg', tight ? 'mt-1 text-body' : 'mt-2 text-body-l')}>{bio.role}</p>
  );
  const tagline = (className: string) => (
    <p className={cx(className, 'text-pretty text-fg', tight ? 'text-body' : 'text-body-l')}>{bio.tagline}</p>
  );
  const availability = (className: string) => (
    <div className={cx(className, 'flex')}>
      <Chip className="gap-2">
        <span aria-hidden="true" className="block size-2 bg-xp" />
        {bio.availability}
      </Chip>
    </div>
  );
  const onResume = () => {
    toast.show(`Loot acquired: ${bio.resume.fileName}`, { icon: <PixelIcon name="trophy" size={24} /> });
  };
  // Side by side the two lg CTAs need 492px + a fraction of text width, and the desktop card
  // gives them 496: a 20px column gap (the focus ring reaches 11px) keeps "View projects" on one
  // line. Stacked, 24px clears the 8px drop and the 15px ring below.
  const ctas = (className: string, buttonClass: string) => (
    <div className={cx(className, 'flex gap-x-5 gap-y-6')}>
      <Button
        href="#projects"
        size="lg"
        className={buttonClass}
        leadingIcon={<PixelIcon name="play" size={24} />}
      >
        View projects
      </Button>
      <Button
        href={bio.resume.href}
        download={bio.resume.fileName}
        variant="secondary"
        size="lg"
        className={buttonClass}
        leadingIcon={<PixelIcon name="download" size={24} />}
        onClick={onResume}
      >
        Resume
      </Button>
    </div>
  );
  const pressStart = (className: string) => (
    <Button
      ref={pressStartRef}
      variant="ghost"
      className={className}
      onClick={startGame}
      leadingIcon={<PixelIcon name="joystick" size={24} />}
    >
      Press start to play
    </Button>
  );

  let cardBody: ReactNode;
  if (tight) {
    cardBody = (
      <>
        {eyebrow}
        {name}
        {role}
        {ctas(cx('mt-4', fullCard ? 'flex-row' : 'flex-col'), fullCard ? 'w-auto' : 'w-full')}
        {availability('mt-4')}
        {tagline('mt-3')}
        {pressStart('mt-2')}
      </>
    );
  } else if (titleOrder) {
    cardBody = (
      <>
        {eyebrow}
        {name}
        {role}
        {tagline('mt-3')}
        {availability('mt-4')}
        {ctas('mt-6 flex-col md:flex-row', 'w-full md:w-auto')}
        {pressStart('mt-4')}
      </>
    );
  } else if (overlay) {
    cardBody = (
      <>
        {eyebrow}
        {name}
        {role}
        {ctas(cx('mt-6', fullCard ? 'flex-row' : 'flex-col'), fullCard ? 'w-auto' : 'w-full')}
        {availability('mt-6')}
        {tagline('mt-4')}
        {pressStart('mt-4')}
      </>
    );
  } else if (wideBand) {
    cardBody = (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-8">
        <div className="min-w-0">
          {eyebrow}
          {name}
          {role}
          {tagline('mt-3 max-w-[60ch]')}
          {availability('mt-4')}
        </div>
        {/* The primary CTA's top lines up with the name's. */}
        <div className="flex flex-col items-start pt-7">
          {ctas('flex-col self-stretch', 'w-full')}
          {pressStart('mt-4')}
        </div>
      </div>
    );
  } else {
    cardBody = (
      <>
        {eyebrow}
        {name}
        {role}
        {availability('mt-4')}
        {ctas('mt-6 flex-col sm:flex-row', 'w-full sm:w-auto')}
        {tagline('mt-6')}
        {pressStart('mt-4')}
      </>
    );
  }

  const titleCard = (
    <div
      ref={cardRef}
      className={overlay ? 'max-w-full' : undefined}
      style={overlay ? { width: `${scene.cardW}px` } : undefined}
    >
      <PixelPanel
        variant="wood"
        elevation={overlay ? 2 : 0}
        padding={tight ? 'sm' : 'md'}
        className={overlay ? undefined : 'w-full px-4 pb-10 pt-6 md:px-6 md:pt-8'}
      >
        <div className={overlay ? undefined : wideBand ? 'mx-auto max-w-[1120px]' : 'mx-auto max-w-[544px]'}>
          {cardBody}
        </div>
      </PixelPanel>
    </div>
  );

  const gameClass =
    mode === 'touch'
      ? 'fixed inset-0 z-[200] flex items-center justify-center bg-bg'
      : mode === 'rotate'
        ? 'px-dots fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-bg px-4'
        : 'px-dots absolute inset-x-0 bottom-0 top-16 z-20 flex flex-col items-center justify-center gap-6 bg-bg px-4';

  return (
    <LazyMotion features={domAnimation}>
      <section
        id="hero"
        aria-labelledby="hero-title"
        data-layout={layout}
        data-compact={compact || undefined}
        className={cx(
          'relative bg-bg pt-16',
          overlay ? 'hero--overlay flex flex-col overflow-hidden' : 'overflow-x-clip pb-1',
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
          <m.div
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
          </m.div>
          <div aria-hidden="true" className="hero-night-wash pointer-events-none absolute inset-0" />
        </div>

        {/* ── HUD nameplate (desktop) ─────────────────────────────────────── */}
        {overlay && scene.hudClear && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-10">
            <div className="mx-auto flex max-w-[1120px] justify-end px-6 pt-4 lg:px-8">
              <m.div
                ref={hudRef}
                initial={false}
                animate={isPlaying ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
                transition={slide(16)}
              >
                <HudNameplate />
              </m.div>
            </div>
          </div>
        )}

        {/* ── Title card ──────────────────────────────────────────────────── */}
        <m.div
          ref={titleRef}
          className={cx(
            'relative z-10',
            overlay && 'mx-auto w-full max-w-[1120px] flex-1 px-4 pb-9 md:px-6 lg:px-8',
          )}
          style={overlay ? { paddingTop: `${cardTop}px` } : undefined}
          initial={false}
          animate={isPlaying ? { opacity: 0, x: -24 } : { opacity: 1, x: 0 }}
          transition={slide(24)}
        >
          {titleCard}
        </m.div>

        {/* ── Scroll cue (desktop), on the dirt under the grass ───────────── */}
        {showScrollCue && (
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-center gap-2 text-hud text-fg"
            style={{ bottom: `${Math.round((scene.dirtH - 16) / 2)}px` }}
            initial={false}
            animate={{ opacity: isPlaying ? 0 : 1 }}
            transition={sceneTransition}
          >
            SCROLL
            <PixelIcon name="arrow-down" size={12} />
          </m.div>
        )}

        {/* ── Game / rotate prompt ────────────────────────────────────────── */}
        <AnimatePresence>
          {isPlaying && (
            <m.div
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
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
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
                  {mode === 'desktop' && <ControlsHint />}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </section>
    </LazyMotion>
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
