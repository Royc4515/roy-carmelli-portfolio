import { CANVAS_CONFIG, PLAYER_CONFIG } from './config';

const FEET_Y = CANVAS_CONFIG.groundY - PLAYER_CONFIG.groundOffset;
const SHADOW_H = 4;
/** Inset (px) of the shadow's top and bottom rows. */
const STEP_IN = 3;
const SHADOW_COLOR = 'rgba(13,22,8,0.35)';
/** Height (px) above the ground at which a shadow has shrunk to its smallest. */
const FADE_LIFT = 110;
const MIN_SHRINK = 0.35;

/**
 * A soft contact shadow on the feet line, so sprites stand on the grass instead of looking
 * pasted onto it (the forest's own fence posts and trunks end on a dark line). `lift` is how
 * far the sprite's bottom is above the ground: a jumping Roy's shadow shrinks under him.
 */
export function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  width: number,
  lift = 0,
): void {
  const shrink = Math.max(MIN_SHRINK, 1 - Math.max(0, lift) / FADE_LIFT);
  const w = Math.round(width * shrink);
  if (w < 4) return;
  // Stepped rows (widest in the middle) rather than an anti-aliased ellipse, so the shadow
  // is pixel art like everything else.
  ctx.fillStyle = SHADOW_COLOR;
  const x = Math.round(centerX - w / 2);
  const steps = [STEP_IN, 0, STEP_IN];
  for (let i = 0; i < SHADOW_H - 1; i++) {
    const inset = steps[i];
    ctx.fillRect(x + inset, FEET_Y - 2 + i, w - inset * 2, 1);
  }
}
