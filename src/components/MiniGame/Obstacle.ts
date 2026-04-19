import { CANVAS_CONFIG, OBSTACLE_CONFIG, SPRITE_PATHS, PLAYER_CONFIG } from './config';
import type { AABB, ObstacleDef, ObstacleKind } from './types';
import type { SpriteRenderer } from './SpriteRenderer';

// ─── Single obstacle ──────────────────────────────────────────────────────────

export class Obstacle {
  x: number;
  readonly y: number;
  readonly def: ObstacleDef;
  readonly kind: ObstacleKind;

  constructor(kind: ObstacleKind, def: ObstacleDef) {
    this.kind = kind;
    this.def = def;
    // Spawn just off the right edge
    this.x = CANVAS_CONFIG.width + 20;

    if (kind === 'ground') {
      // Feet touch the visual ground line
      this.y = CANVAS_CONFIG.groundY - def.h - PLAYER_CONFIG.groundOffset;
    } else {
      // Air obstacle: some fraction down the canvas
      this.y = CANVAS_CONFIG.height * OBSTACLE_CONFIG.airYFraction;
    }
  }

  update(dt: number, scrollSpeed: number): void {
    this.x -= scrollSpeed * dt;
  }

  isOffScreen(): boolean {
    return this.x + this.def.w < 0;
  }

  getHitbox(): AABB {
    const i = OBSTACLE_CONFIG.hitboxInset;
    return {
      x: this.x + i,
      y: this.y + i,
      w: this.def.w - i * 2,
      h: this.def.h - i * 2,
    };
  }

  draw(ctx: CanvasRenderingContext2D, renderer: SpriteRenderer): void {
    renderer.draw(ctx, this.def.src, this.x, this.y, this.def.w, this.def.h);
  }
}

// ─── Obstacle manager ─────────────────────────────────────────────────────────

export class ObstacleManager {
  private pool: Obstacle[] = [];
  private spawnTimer: number;

  constructor() {
    this.spawnTimer = this.nextInterval();
  }

  reset(): void {
    this.pool = [];
    this.spawnTimer = this.nextInterval();
  }

  update(dt: number, scrollSpeed: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = this.nextInterval();
    }
    for (const obs of this.pool) obs.update(dt, scrollSpeed);
    this.pool = this.pool.filter(o => !o.isOffScreen());
  }

  getAll(): readonly Obstacle[] {
    return this.pool;
  }

  draw(ctx: CanvasRenderingContext2D, renderer: SpriteRenderer): void {
    for (const obs of this.pool) obs.draw(ctx, renderer);
  }

  private spawn(): void {
    // 30 % chance of an air obstacle
    const kind: ObstacleKind = Math.random() < 0.3 ? 'air' : 'ground';
    const pool = kind === 'air'
      ? SPRITE_PATHS.obstacles.air
      : SPRITE_PATHS.obstacles.ground;
    const def = pool[Math.floor(Math.random() * pool.length)] as ObstacleDef;
    this.pool.push(new Obstacle(kind, def));
  }

  private nextInterval(): number {
    return OBSTACLE_CONFIG.spawnIntervalMin
      + Math.random() * (OBSTACLE_CONFIG.spawnIntervalMax - OBSTACLE_CONFIG.spawnIntervalMin);
  }
}
