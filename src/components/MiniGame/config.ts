import { SPRITE_SIZES } from './spriteSizes.generated';

const BASE = '/assets/sprites';

const GROUND_OBSTACLES = [
  'racoon', 'stump', 'stump-moss', 'rock', 'mushrooms', 'toadstools', 'agave', 'beetle', 'hedgehog',
] as const;
const AIR_OBSTACLES = ['bird-blue', 'bird-brown', 'bat'] as const;
/** Player hitbox width: the old 56 px sprite minus its 10 px insets, as the game was tuned. */
const HITBOX_W = 36;
// Every sprite is drawn 1:1. scripts/pixelate/import_flow.py already sizes them to real-world
// proportions against the forest (Roy 1.75 m = 92 px, a stump 0.7 m, ...).
const PLAYER_W = SPRITE_SIZES.player.w;
/**
 * Clear air (px) between the top of the slide pose and the bottom of an air obstacle. Roy's big
 * head keeps even a low baseball slide at ~80% of his height, so the bird flies at the top of
 * a standing Roy's head and the margin on each side is small (geometry.test.ts checks both).
 */
const SLIDE_AIR_GAP = 4;

// ─── Canvas ───────────────────────────────────────────────────────────────────
export const CANVAS_CONFIG = {
  width: 800,
  height: 446,
  /** Pixel Y of the visual ground line — ~95% of canvas height matches the bg image */
  groundY: 424
} as const;

// ─── Physics ──────────────────────────────────────────────────────────────────
export const PHYSICS_CONFIG = {
  gravity: 1800,       // px / s²
  jumpForce: -620,     // px / s  (negative = upward)
  maxFallSpeed: 1000,  // px / s  cap
} as const;

// ─── Scroll ───────────────────────────────────────────────────────────────────
export const SCROLL_CONFIG = {
  initialSpeed: 250,   // px / s
  acceleration: 5,     // px / s gained per second of playtime
  maxSpeed: 560,       // px / s hard cap
} as const;

// ─── Player ───────────────────────────────────────────────────────────────────
export const PLAYER_CONFIG = {
  displayW: PLAYER_W,
  displayH: SPRITE_SIZES.player.h,
  /** Visual render size for the slide sprite */
  slideW: SPRITE_SIZES.slide.w,
  slideH: SPRITE_SIZES.slide.h,
  /** Collision hitbox height while sliding (much shorter than standing) */
  slideHitboxH: 32,
  /** Side insets while sliding: the lying pose is wider than the standing hitbox. */
  slideHitboxInsetX: 8,
  /** How long a slide lasts (seconds) */
  slideDuration: 0.65,
  /** Render size of the drop-into-slide and get-up frames (slideIn / slideOut). */
  slideMoveW: SPRITE_SIZES.slideMove.w,
  slideMoveH: SPRITE_SIZES.slideMove.h,
  /**
   * The slide's phases: each drop-in and get-up frame shows for this long (ms), and the flat
   * pose in between alternates its two frames every slideLoopMs.
   */
  slideMoveFrameMs: 70,
  slideLoopMs: 120,
  /** Gap between sprite bottom and the ground line */
  groundOffset: 4,
  /** Fraction of canvas width: player x during IDLE / TRANSITION start */
  idleFraction: 0.5,
  /** Fraction of canvas width: player x during PLAYING */
  runFraction: 0.13,
  /** Seconds for slide-in from center to running position */
  transitionDuration: 0.75,
  /**
   * Inner hitbox insets (px) relative to display rect. The sides keep the hitbox
   * HITBOX_W wide whatever the sprite's width, so a bigger, more detailed Roy does not
   * make the obstacles any harder to clear.
   */
  hitboxInset: {
    left: Math.floor((PLAYER_W - HITBOX_W) / 2),
    // His whole head counts: a bird at head height has to hit it (see SLIDE_AIR_GAP).
    top: 0,
    right: Math.ceil((PLAYER_W - HITBOX_W) / 2),
    bottom: 4,
  },
} as const;

// ─── Obstacles ────────────────────────────────────────────────────────────────
export const OBSTACLE_CONFIG = {
  spawnIntervalMin: 1.5,  // s
  spawnIntervalMax: 3.2,  // s
  /**
   * Gap (px) between the feet line and an air obstacle's bottom edge: the visible top of the
   * slide pose plus SLIDE_AIR_GAP, so a sliding Roy clearly passes under a bird, whose hitbox
   * still spans a standing Roy's head and chest (geometry.test.ts).
   */
  airLift: SPRITE_SIZES.slide.h - SPRITE_SIZES.slide.top + SLIDE_AIR_GAP,
  /** Inner hitbox inset: at most this many px... */
  hitboxInset: 10,
  /** ...and at most this share of the sprite's smaller side, so small animals still collide. */
  hitboxInsetShare: 0.2,
} as const;

// ─── Score ────────────────────────────────────────────────────────────────────
export const SCORE_CONFIG = {
  pointsPerSecond: 8,
  /** A chime every this many points (about every 12 s). */
  milestone: 100,
} as const;

// ─── Sprite paths ─────────────────────────────────────────────────────────────
export const SPRITE_PATHS = {
  player: {
    wave:     [`${BASE}/wave-1.png`,  `${BASE}/wave-2.png`,  `${BASE}/wave-3.png`],
    run:      [`${BASE}/run-1.png`,   `${BASE}/run-2.png`,   `${BASE}/run-3.png`,
               `${BASE}/run-4.png`,   `${BASE}/run-5.png`,   `${BASE}/run-6.png`,
               `${BASE}/run-7.png`],
    // jump-1 is the standing take-off pose; rising on it read as Roy floating up stiffly
    jumpUp:   [`${BASE}/jump-2.png`],
    jumpDown: [`${BASE}/jump-3.png`,  `${BASE}/jump-4.png`],
    stand:    [`${BASE}/stand-1.png`, `${BASE}/stand-2.png`],
    idle:     [`${BASE}/idle.png`],
    slide:    [`${BASE}/slide-2.png`, `${BASE}/slide-3.png`],
    slideIn:  [`${BASE}/slide-in-1.png`, `${BASE}/slide-in-2.png`],
    slideOut: [`${BASE}/slide-out-1.png`, `${BASE}/slide-out-2.png`],
  } satisfies Record<string, string[]>,

  obstacles: {
    ground: GROUND_OBSTACLES.map(name => ({ src: `${BASE}/${name}.png`, ...SPRITE_SIZES.obstacles[name] })),
    air: AIR_OBSTACLES.map(name => ({ src: `${BASE}/${name}.png`, ...SPRITE_SIZES.obstacles[name] })),
  },

  background: `${BASE}/background.png`,
  portrait: `${BASE}/portrait.png`,
} as const;

// ─── Background ───────────────────────────────────────────────────────────────
/**
 * The background is drawn at 2.5x, shifted so its grass line keeps the tuned ground,
 * obstacle heights and jump arc. Its fence then stands 46 px, about 0.88 m next to a 1.75 m
 * Roy: waist high. (3x made the forest 20% bigger, fence at his chest, Roy small again; a
 * half-step scale keeps forest pixels in an even 2-3-2-3 rhythm instead of 2.53x's jitter.)
 */
const BG_SCALE = 2.5;
// px from the top of the grass to CANVAS_CONFIG.groundY: the feet (groundY - groundOffset) then
// land 10 px into the 20 px grass band rather than on the dark line along its top.
const GRASS_ABOVE_GROUND = 14;

export const BACKGROUND_CONFIG = {
  scale: BG_SCALE,
  tileW: Math.round(SPRITE_SIZES.background.w * BG_SCALE),
  tileH: Math.round(SPRITE_SIZES.background.h * BG_SCALE),
  /** Canvas y of the tile's top edge (negative: the canopy's top rows run off the canvas). */
  top: Math.round(CANVAS_CONFIG.groundY - GRASS_ABOVE_GROUND - SPRITE_SIZES.background.groundRow * BG_SCALE),
} as const;

// ─── Player card (top-left HUD) ───────────────────────────────────────────────
export const HUD_CONFIG = {
  x: 8,
  y: 8,
  w: 208,
  h: 76,
  portrait: SPRITE_SIZES.portrait,
} as const;

// ─── Frame intervals (ms per frame) ───────────────────────────────────────────
export const FRAME_INTERVALS: Readonly<Record<string, number>> = {
  wave:     380,
  run:      85,
  jumpUp:   120,
  jumpDown: 120,
  stand:    500,
  idle:     0,   // single frame — never advances
  slide:    80,
};
