const BASE = '/assets/sprites';

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
  displayW: 56,
  displayH: 72,
  /** Visual render size for the slide sprite */
  slideW: 56,
  slideH: 72,
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
  /** Inner hitbox insets (px) relative to display rect */
  hitboxInset: { left: 10, top: 8, right: 10, bottom: 4 },
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
    ground: [
      { src: `${BASE}/racoon.png`,                                    w: 48, h: 52 },
      { src: `${BASE}/sprites_for_the_202604192014(1).png`,           w: 44, h: 54 },
      { src: `${BASE}/sprites_for_the_202604192014(2).png`,           w: 44, h: 54 },
      { src: `${BASE}/sprites_for_the_202604192014(3).png`,           w: 44, h: 54 },
      { src: `${BASE}/sprites_for_the_202604192014(4).png`,           w: 44, h: 54 },
      { src: `${BASE}/sprites_for_the_202604192014(5).png`,           w: 44, h: 54 },
      { src: `${BASE}/sprites_for_the_202604192014(6).png`,           w: 44, h: 54 },
    ],
    air: [
      { src: `${BASE}/bird-blue.png`,  w: 50, h: 60 },
      { src: `${BASE}/bird-brown.png`, w: 50, h: 60 },
    ],
  },

  background: `${BASE}/background.png`,
  playerScoreHUD: `${BASE}/player score.png`,
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
