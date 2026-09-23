/**
 * Motion tokens for Framer Motion (docs/redesign/SPEC.md §2.5).
 * Mirrors the `--dur-*` and `--ease-*` custom properties in src/index.css;
 * motion.test.ts fails if the two drift apart.
 */
import { steps, type BezierDefinition, type Transition, type Variants } from 'framer-motion';

/** Durations in milliseconds (CSS: `--dur-*`). Framer Motion wants seconds: see `seconds()`. */
export const duration = {
  /** active / press */
  instant: 80,
  /** hover, focus (stepped: `steps(2)`) */
  fast: 120,
  /** state changes, tooltip */
  base: 200,
  /** zone banner, quest log, pause menu (stepped: `steps(4)`) */
  slow: 360,
  /** hero <-> game */
  scene: 600,
} as const;

export type DurationToken = keyof typeof duration;

/** Cubic-bezier control points (CSS: `--ease-*`). */
export const ease = {
  /** UI default */
  snap: [0.2, 0.8, 0.2, 1],
  /** scene transitions */
  scene: [0.65, 0, 0.35, 1],
  /** toasts only */
  pop: [0.34, 1.56, 0.64, 1],
} as const satisfies Record<string, BezierDefinition>;

export type EaseToken = keyof typeof ease;

/** Milliseconds to seconds, for Framer Motion `duration` / `delay`. */
export const seconds = (ms: number): number => ms / 1000;

/** Ready-made transitions, one per duration token, with the SPEC pairing. */
export const transition = {
  instant: { duration: seconds(duration.instant), ease: ease.snap },
  fast: { duration: seconds(duration.fast), ease: steps(2) },
  base: { duration: seconds(duration.base), ease: ease.snap },
  slow: { duration: seconds(duration.slow), ease: steps(4) },
  scene: { duration: seconds(duration.scene), ease: ease.scene },
} satisfies Record<DurationToken, Transition>;

/** Scroll-reveal timing: 240ms, 60ms stagger, only the first 4 items are staggered. */
export const MATERIALIZE_MS = 240;
export const MATERIALIZE_STAGGER_MS = 60;
export const MATERIALIZE_MAX_STAGGERED = 4;

/** Reveal delay in seconds for the item at `index` (capped so item 5+ waits no longer than item 4). */
export function materializeDelay(index = 0): number {
  const step = Math.min(Math.max(Math.floor(index), 0), MATERIALIZE_MAX_STAGGERED - 1);
  return seconds(step * MATERIALIZE_STAGGER_MS);
}

/**
 * "Materialize" scroll reveal: opacity in 3 hard steps (0 → .33 → .66 → 1) and
 * y 8 → 0 in 2px steps, over 240ms. Pass the item index as `custom` for the
 * stagger:
 *
 *   <motion.li variants={materialize} custom={i} initial="hidden"
 *     whileInView="visible" viewport={{ once: true }} />
 *
 * The resting state must be visible when reduced motion is on: skip `initial`
 * in that case (see usePrefersReducedMotion).
 */
export const materialize = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number = 0) => {
    const delay = materializeDelay(index);
    const time = seconds(MATERIALIZE_MS);
    return {
      opacity: [0, 0.33, 0.66, 1],
      y: 0,
      transition: {
        // Each segment jumps straight to its end value: three visible steps.
        opacity: { duration: time, delay, times: [0, 0.33, 0.66, 1], ease: steps(1, 'start') },
        // 8 → 6 → 4 → 2 → 0: whole-pixel positions only.
        y: { duration: time, delay, ease: steps(4, 'start') },
      },
    };
  },
} satisfies Variants;
