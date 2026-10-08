import { SPRITE_SIZES } from './spriteSizes.generated';

const BASE = '/assets/sprites';

const GROUND_OBSTACLES = [
  'racoon', 'stump', 'stump-moss', 'rock', 'mushrooms', 'toadstools', 'agave', 'beetle', 'hedgehog',
] as const;
const AIR_OBSTACLES = ['bird-blue', 'bird-brown', 'bat'] as const;
/** Player hitbox width: the old 56 px sprite minus its 10 px insets, as the game was tuned. */
const HITBOX_W = 36;
/**
 * Roy is drawn at this multiple of his native sprite. The forest is drawn about 2.5x its
 * native pixels, so a 1:1 Roy looked small next to the trees and fences; 1.5x keeps him the
 * clear lead (about a third of the canvas height) while the obstacles keep their tuned size.
 */
const PLAYER_SCALE = 1.5;
const PLAYER_W = Math.round(SPRITE_SIZES.player.w * PLAYER_SCALE);

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
  displayH: Math.round(SPRITE_SIZES.player.h * PLAYER_SCALE),
  /** Visual render size for the slide sprite */
  slideW: Math.round(SPRITE_SIZES.slide.w * PLAYER_SCALE),
  slideH: Math.round(SPRITE_SIZES.slide.h * PLAYER_SCALE),
  /** Collision hitbox height while sliding (much shorter than standing) */
  slideHitboxH: 32,
  /** How long a slide lasts (seconds) */
  slideDuration: 0.65,
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
    top: 8,
    right: Math.ceil((PLAYER_W - HITBOX_W) / 2),
    bottom: 4,
  },
} as const;

// ─── Obstacles ────────────────────────────────────────────────────────────────
export const OBSTACLE_CONFIG = {
  spawnIntervalMin: 1.5,  // s
  spawnIntervalMax: 3.2,  // s
  /** Y fraction of canvas height for air-type obstacles */
  airYFraction: 0.7,
  /** Uniform inner hitbox inset for all obstacles */
  hitboxInset: 10,
} as const;

// ─── Score ────────────────────────────────────────────────────────────────────
export const SCORE_CONFIG = {
  pointsPerSecond: 8,
} as const;

// ─── Sprite paths ─────────────────────────────────────────────────────────────
export const SPRITE_PATHS = {
  player: {
    wave:     [`${BASE}/wave-1.png`,  `${BASE}/wave-2.png`,  `${BASE}/wave-3.png`],
    run:      [`${BASE}/run-1.png`,   `${BASE}/run-2.png`,   `${BASE}/run-3.png`,
               `${BASE}/run-4.png`,   `${BASE}/run-5.png`,   `${BASE}/run-6.png`,
               `${BASE}/run-7.png`],
    jumpUp:   [`${BASE}/jump-1.png`,  `${BASE}/jump-2.png`],
    jumpDown: [`${BASE}/jump-3.png`,  `${BASE}/jump-4.png`],
    stand:    [`${BASE}/stand-1.png`, `${BASE}/stand-2.png`],
    idle:     [`${BASE}/idle.png`],
    slide:    [`${BASE}/slide-2.png`, `${BASE}/slide-3.png`],
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
 * The background is scaled so its grass line lands where the old art's did, which keeps
 * the ground, the obstacles and the jump arc exactly as they were tuned.
 */
const GRASS_ABOVE_GROUND = 24; // px from the top of the grass to CANVAS_CONFIG.groundY
const BG_SCALE = (CANVAS_CONFIG.groundY - GRASS_ABOVE_GROUND) / SPRITE_SIZES.background.groundRow;

export const BACKGROUND_CONFIG = {
  tileW: Math.round(SPRITE_SIZES.background.w * BG_SCALE),
  tileH: Math.round(SPRITE_SIZES.background.h * BG_SCALE),
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
