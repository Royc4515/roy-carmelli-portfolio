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
        this.frameIdx = (this.frameIdx + 1) % len;
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
      return {
        x: this.x + left,
        y: hitboxY + top,
        w: PLAYER_CONFIG.slideW - left - right,
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
      // Render at full standing height so the sprite isn't squished
      const drawY = this.groundStandY + PLAYER_CONFIG.displayH - PLAYER_CONFIG.slideH;
      renderer.draw(ctx, src, this.x, drawY, PLAYER_CONFIG.slideW, PLAYER_CONFIG.slideH);
    } else {
      renderer.draw(ctx, src, this.x, this.y, PLAYER_CONFIG.displayW, PLAYER_CONFIG.displayH);
    }
  }

  private get frames(): readonly string[] {
    return SPRITE_PATHS.player[this.animState] ?? SPRITE_PATHS.player.idle;
  }
}
