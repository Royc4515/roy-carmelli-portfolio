import {
  CANVAS_CONFIG, PHYSICS_CONFIG, PLAYER_CONFIG,
  SPRITE_PATHS, FRAME_INTERVALS,
} from './config';
import type { AABB, PlayerAnimState } from './types';
import type { SpriteRenderer } from './SpriteRenderer';

export class Player {
  x: number;
  y: number;
  velocityY = 0;
  isOnGround = true;
  animState: PlayerAnimState = 'wave';

  private frameIdx = 0;
  private frameClock = 0;
  private prevAnimState: PlayerAnimState = 'wave';

  /** Y coordinate of player top when standing on the ground */
  private readonly groundStandY: number;

  constructor(canvasW: number, canvasH: number) {
    this.groundStandY =
      CANVAS_CONFIG.groundY - PLAYER_CONFIG.displayH - PLAYER_CONFIG.groundOffset;
    this.x = canvasW * PLAYER_CONFIG.idleFraction - PLAYER_CONFIG.displayW / 2;
    this.y = this.groundStandY;

    void canvasH; // kept for API symmetry
  }

  jump(): void {
    if (!this.isOnGround) return;
    this.velocityY = PHYSICS_CONFIG.jumpForce;
    this.isOnGround = false;
  }

  /**
   * Reset to idle position (center of canvas).
   * Called when restarting the game.
   */
  reset(canvasW: number): void {
    this.x = canvasW * PLAYER_CONFIG.idleFraction - PLAYER_CONFIG.displayW / 2;
    this.y = this.groundStandY;
    this.velocityY = 0;
    this.isOnGround = true;
    this.animState = 'wave';
    this.frameIdx = 0;
    this.frameClock = 0;
    this.prevAnimState = 'wave';
  }

  update(dt: number): void {
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
        // Only resume running if we were in jumping states
        if (this.animState === 'jumpUp' || this.animState === 'jumpDown') {
          this.animState = 'run';
        }
      }
    }

    // ── Derive jump sub-state from vertical velocity ───────────────────
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
        this.frameIdx = (this.frameIdx + 1) % len;
      }
    }
  }

  getHitbox(): AABB {
    const { left, top, right, bottom } = PLAYER_CONFIG.hitboxInset;
    return {
      x: this.x + left,
      y: this.y + top,
      w: PLAYER_CONFIG.displayW - left - right,
      h: PLAYER_CONFIG.displayH - top - bottom,
    };
  }

  draw(ctx: CanvasRenderingContext2D, renderer: SpriteRenderer): void {
    const src = this.frames[Math.min(this.frameIdx, this.frames.length - 1)];
    renderer.draw(ctx, src, this.x, this.y, PLAYER_CONFIG.displayW, PLAYER_CONFIG.displayH);
  }

  private get frames(): readonly string[] {
    return SPRITE_PATHS.player[this.animState] ?? SPRITE_PATHS.player.idle;
  }
}
