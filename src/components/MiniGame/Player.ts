import {
  CANVAS_CONFIG, PHYSICS_CONFIG, PLAYER_CONFIG,
  SPRITE_PATHS, FRAME_INTERVALS,
} from './config';
import type { AABB, PlayerAnimState } from './types';
import type { SpriteRenderer } from './SpriteRenderer';
import { drawContactShadow } from './shadow';

/** Animations that play once and hold their last frame. */
const HOLD_LAST: ReadonlySet<PlayerAnimState> = new Set(['jumpUp', 'jumpDown']);

/**
 * Offset that centres a `w` px wide frame on the standing frame, so Roy's body does not jump
 * back when a wider slide frame takes over from the run.
 */
function centered(w: number): number {
  return Math.round((PLAYER_CONFIG.displayW - w) / 2);
}

export interface SlideFrame {
  src: string;
  w: number;
  h: number;
}

/**
 * The slide's frame `elapsed` s into a slide of `PLAYER_CONFIG.slideDuration`: the drop-in
 * frames, then the flat pose alternating its two frames, then the get-up frames, so Roy
 * goes down and comes back up instead of snapping between running and lying flat.
 */
export function slideFrame(elapsed: number): SlideFrame {
  const { slideDuration, slideMoveFrameMs, slideLoopMs } = PLAYER_CONFIG;
  const { slide, slideIn, slideOut } = SPRITE_PATHS.player;
  const ms = Math.max(0, elapsed) * 1000;
  const left = slideDuration * 1000 - ms;
  const move = { w: PLAYER_CONFIG.slideMoveW, h: PLAYER_CONFIG.slideMoveH };
  if (ms < slideIn.length * slideMoveFrameMs) {
    return { src: slideIn[Math.floor(ms / slideMoveFrameMs)], ...move };
  }
  if (left <= slideOut.length * slideMoveFrameMs) {
    const i = slideOut.length - Math.max(1, Math.ceil(left / slideMoveFrameMs));
    return { src: slideOut[Math.min(slideOut.length - 1, i)], ...move };
  }
  const loop = Math.floor((ms - slideIn.length * slideMoveFrameMs) / slideLoopMs) % slide.length;
  return { src: slide[loop], w: PLAYER_CONFIG.slideW, h: PLAYER_CONFIG.slideH };
}
/** Roy's shadow spans this share of his sprite (his arms and the frame padding stick out). */
const SHADOW_SHARE = 0.55;

export class Player {
  x: number;
  y: number;
  velocityY = 0;
  isOnGround = true;
  animState: PlayerAnimState = 'wave';

  private frameIdx = 0;
  private frameClock = 0;
  private prevAnimState: PlayerAnimState = 'wave';
  private slideTimer = 0;

  private readonly groundStandY: number;

  constructor(canvasW: number, canvasH: number) {
    this.groundStandY =
      CANVAS_CONFIG.groundY - PLAYER_CONFIG.displayH - PLAYER_CONFIG.groundOffset;
    this.x = canvasW * PLAYER_CONFIG.idleFraction - PLAYER_CONFIG.displayW / 2;
    this.y = this.groundStandY;
    void canvasH;
  }

  jump(): void {
    if (!this.isOnGround) return;
    if (this.animState === 'slide') this.slideTimer = 0; // cancel slide on jump
    this.velocityY = PHYSICS_CONFIG.jumpForce;
    this.isOnGround = false;
  }

  slide(): void {
    if (!this.isOnGround || this.animState === 'slide') return;
    this.animState = 'slide';
    this.slideTimer = PLAYER_CONFIG.slideDuration;
  }

  reset(canvasW: number): void {
    this.x = canvasW * PLAYER_CONFIG.idleFraction - PLAYER_CONFIG.displayW / 2;
    this.y = this.groundStandY;
    this.velocityY = 0;
    this.isOnGround = true;
    this.animState = 'wave';
    this.frameIdx = 0;
    this.frameClock = 0;
    this.prevAnimState = 'wave';
    this.slideTimer = 0;
  }

  update(dt: number): void {
    // ── Slide timer ───────────────────────────────────────────────────────
    if (this.animState === 'slide') {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.slideTimer = 0;
        this.animState = 'run';
      }
    }

    // ── Vertical physics ──────────────────────────────────────────────────
    if (!this.isOnGround) {
      this.velocityY = Math.min(
        this.velocityY + PHYSICS_CONFIG.gravity * dt,
        PHYSICS_CONFIG.maxFallSpeed,
      );
      this.y += this.velocityY * dt;

      if (this.y >= this.groundStandY) {
        this.y = this.groundStandY;
        this.velocityY = 0;
        this.isOnGround = true;
        if (this.animState === 'jumpUp' || this.animState === 'jumpDown') {
          this.animState = 'run';
        }
      }
    }

    // ── Derive jump sub-state from vertical velocity ──────────────────────
    if (!this.isOnGround) {
      this.animState = this.velocityY < 0 ? 'jumpUp' : 'jumpDown';
    }

    // ── Advance animation frame ───────────────────────────────────────────
    if (this.animState !== this.prevAnimState) {
      this.frameIdx = 0;
      this.frameClock = 0;
      this.prevAnimState = this.animState;
    }

    const interval = FRAME_INTERVALS[this.animState] ?? 100;
    if (interval > 0) {
      this.frameClock += dt * 1000;
      if (this.frameClock >= interval) {
        this.frameClock -= interval;
        const len = this.frames.length;
        // the jump halves play once then hold their last frame: looping them flashed the
        // standing take-off pose at the top of the jump (the slide has slideFrame)
        if (HOLD_LAST.has(this.animState)) {
          this.frameIdx = Math.min(this.frameIdx + 1, len - 1);
        } else {
          this.frameIdx = (this.frameIdx + 1) % len;
        }
      }
    }
  }

  get isSliding(): boolean {
    return this.animState === 'slide';
  }

  getHitbox(): AABB {
    const { left, top, right, bottom } = PLAYER_CONFIG.hitboxInset;
    if (this.isSliding) {
      const hitboxY = this.groundStandY + PLAYER_CONFIG.displayH - PLAYER_CONFIG.slideHitboxH;
      const side = PLAYER_CONFIG.slideHitboxInsetX;
      return {
        x: this.x + centered(PLAYER_CONFIG.slideW) + side,
        y: hitboxY + top,
        w: PLAYER_CONFIG.slideW - side * 2,
        h: PLAYER_CONFIG.slideHitboxH - top - bottom,
      };
    }
    return {
      x: this.x + left,
      y: this.y + top,
      w: PLAYER_CONFIG.displayW - left - right,
      h: PLAYER_CONFIG.displayH - top - bottom,
    };
  }

  draw(ctx: CanvasRenderingContext2D, renderer: SpriteRenderer): void {
    const src = this.frames[Math.min(this.frameIdx, this.frames.length - 1)];
    if (this.isSliding) {
      const f = slideFrame(PLAYER_CONFIG.slideDuration - this.slideTimer);
      const x = this.x + centered(f.w);
      drawContactShadow(ctx, x + f.w / 2, f.w * SHADOW_SHARE);
      // Bottom-aligned on the feet line, each frame at its own native size
      const drawY = this.groundStandY + PLAYER_CONFIG.displayH - f.h;
      renderer.draw(ctx, f.src, x, drawY, f.w, f.h);
    } else {
      const width = PLAYER_CONFIG.displayW;
      drawContactShadow(ctx, this.x + width / 2, width * SHADOW_SHARE, this.groundStandY - this.y);
      renderer.draw(ctx, src, this.x, this.y, PLAYER_CONFIG.displayW, PLAYER_CONFIG.displayH);
    }
  }

  private get frames(): readonly string[] {
    return SPRITE_PATHS.player[this.animState] ?? SPRITE_PATHS.player.idle;
  }
}
