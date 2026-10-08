import {
  BACKGROUND_CONFIG, CANVAS_CONFIG, PLAYER_CONFIG, SCROLL_CONFIG,
  SCORE_CONFIG, SPRITE_PATHS,
} from './config';
import {
  FONT_LG, FONT_MD, FONT_SM, HUD_COLORS as C, drawPlayerCard, outlinedText, pad,
} from './hud';
import { SpriteRenderer } from './SpriteRenderer';
import { Player } from './Player';
import { ObstacleManager } from './Obstacle';
import type { GameState, AABB } from './types';

// ─── AABB overlap test ────────────────────────────────────────────────────────
function overlaps(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

// ─── GameEngine ───────────────────────────────────────────────────────────────

/** Run lifecycle hooks, so the scoreboard can follow along without touching the canvas. */
export interface GameEngineHooks {
  /** Start pressed: a new run begins (fires once per run, before any points are scored). */
  onRunStart?: () => void;
  /** The run ended; `score` is the whole score shown on the game-over screen. */
  onGameOver?: (score: number) => void;
}

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly renderer = new SpriteRenderer();
  private readonly player: Player;
  private readonly obstacles = new ObstacleManager();

  private state: GameState = 'IDLE';
  private rafId = 0;
  private lastTs = 0;

  private bgOffset = 0;
  private scrollSpeed: number = SCROLL_CONFIG.initialSpeed;
  private score = 0;
  private playTime = 0;

  /** 0..1 progress for the TRANSITION slide-in */
  private transitionT = 0;
  private transitionStartX = 0;
  private transitionTargetX = 0;

  private blinkTimer = 0;
  private blinkVisible = true;

  /** Personal best shown in the HUD; the owner keeps it current with setBest. */
  private best = 0;
  /** The run that just ended beat `best`. */
  private newBest = false;
  private readonly hooks: GameEngineHooks;

  private readonly canvasW: number;
  private readonly canvasH: number;

  constructor(ctx: CanvasRenderingContext2D, hooks: GameEngineHooks = {}) {
    this.ctx = ctx;
    this.hooks = hooks;
    this.canvasW = CANVAS_CONFIG.width;
    this.canvasH = CANVAS_CONFIG.height;
    this.player = new Player(this.canvasW, this.canvasH);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const paths = [
      ...SPRITE_PATHS.player.wave,
      ...SPRITE_PATHS.player.run,
      ...SPRITE_PATHS.player.jumpUp,
      ...SPRITE_PATHS.player.jumpDown,
      ...SPRITE_PATHS.player.stand,
      ...SPRITE_PATHS.player.idle,
      ...SPRITE_PATHS.player.slide,
      ...SPRITE_PATHS.obstacles.ground.map(o => o.src),
      ...SPRITE_PATHS.obstacles.air.map(o => o.src),
      SPRITE_PATHS.background,
      SPRITE_PATHS.portrait,
    ];
    await this.renderer.preload(paths);
    // Ensure Press Start 2P is available before first draw
    try { await document.fonts.load(FONT_MD); } catch { /* ignore */ }
  }

  start(): void {
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  /** Space / click / W / ArrowUp */
  handleInput(): void {
    switch (this.state) {
      case 'IDLE':       this.beginTransition(); break;
      case 'PLAYING':    this.player.jump();      break;
      case 'GAMEOVER':   this.resetGame();        break;
    }
  }

  /** S / ArrowDown — slide under air obstacles */
  handleSlide(): void {
    if (this.state === 'PLAYING') this.player.slide();
  }

  /** Personal best to display. Ignores anything that is not a finite, non-negative number. */
  setBest(best: number): void {
    if (Number.isFinite(best) && best >= 0) this.best = Math.floor(best);
  }

  /** True while the game is waiting to be (re)started — i.e. a tap should begin play. */
  isAwaitingStart(): boolean {
    return this.state === 'IDLE' || this.state === 'GAMEOVER';
  }

  // ── Game loop ───────────────────────────────────────────────────────────────

  private readonly loop = (ts: number): void => {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.1); // cap to 100 ms
    this.lastTs = ts;
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    switch (this.state) {
      case 'IDLE':      this.updateIdle(dt);       break;
      case 'TRANSITION': this.updateTransition(dt); break;
      case 'PLAYING':   this.updatePlaying(dt);    break;
      case 'GAMEOVER':  /* intentionally frozen */  break;
    }
  }

  private updateIdle(dt: number): void {
    this.player.update(dt);
    this.blinkTimer += dt;
    if (this.blinkTimer >= 0.5) { this.blinkTimer = 0; this.blinkVisible = !this.blinkVisible; }
  }

  private updateTransition(dt: number): void {
    this.transitionT = Math.min(
      this.transitionT + dt / PLAYER_CONFIG.transitionDuration,
      1,
    );
    // Smooth ease-out
    const ease = 1 - Math.pow(1 - this.transitionT, 3);
    this.player.x = this.transitionStartX + (this.transitionTargetX - this.transitionStartX) * ease;

    // Scroll background at a fraction of game speed
    this.bgOffset += SCROLL_CONFIG.initialSpeed * 0.6 * dt;

    this.player.update(dt);

    if (this.transitionT >= 1) this.state = 'PLAYING';
  }

  private updatePlaying(dt: number): void {
    this.playTime += dt;
    this.score    += SCORE_CONFIG.pointsPerSecond * dt;

    // Gradually increase scroll speed
    this.scrollSpeed = Math.min(
      SCROLL_CONFIG.initialSpeed + SCROLL_CONFIG.acceleration * this.playTime,
      SCROLL_CONFIG.maxSpeed,
    );

    this.bgOffset += this.scrollSpeed * dt;
    this.player.update(dt);
    this.obstacles.update(dt, this.scrollSpeed);

    // Collision detection
    const pBox = this.player.getHitbox();
    for (const obs of this.obstacles.getAll()) {
      if (overlaps(pBox, obs.getHitbox())) {
        this.triggerGameOver();
        return;
      }
    }
  }

  // ── State transitions ───────────────────────────────────────────────────────

  private beginTransition(): void {
    this.state = 'TRANSITION';
    this.transitionT = 0;
    this.transitionStartX = this.player.x;
    this.transitionTargetX = this.canvasW * PLAYER_CONFIG.runFraction;
    this.player.animState = 'run';
    this.hooks.onRunStart?.();
  }

  private triggerGameOver(): void {
    this.state = 'GAMEOVER';
    this.player.animState = 'stand';
    const final = Math.floor(this.score);
    this.newBest = final > this.best;
    if (this.newBest) this.best = final;
    this.hooks.onGameOver?.(final);
  }

  private resetGame(): void {
    this.score       = 0;
    this.newBest     = false;
    this.playTime    = 0;
    this.scrollSpeed = SCROLL_CONFIG.initialSpeed;
    this.bgOffset    = 0;
    this.blinkVisible = true;
    this.blinkTimer  = 0;
    this.obstacles.reset();
    this.player.reset(this.canvasW);
    this.state = 'IDLE';
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw(): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;

    this.drawScrollingBackground();

    this.obstacles.draw(ctx, this.renderer);
    this.player.draw(ctx, this.renderer);

    this.drawScoreHUD();

    switch (this.state) {
      case 'IDLE':     this.drawIdleUI();     break;
      case 'GAMEOVER': this.drawGameOverUI(); break;
    }
  }

  private drawScrollingBackground(): void {
    const { ctx } = this;
    const bgSrc = SPRITE_PATHS.background;
    const { tileW, tileH } = BACKGROUND_CONFIG;

    // Every other tile is mirrored, so neighbouring edges are the same column of pixels and
    // the loop has no seam whatever the art's edges look like. The pair repeats every 2 tiles.
    // Drawn from y = 0: BACKGROUND_CONFIG's scale puts the grass line on the ground there;
    // the tile is taller than the canvas, so only soil runs off the bottom.
    const offset = this.bgOffset % (tileW * 2);
    for (let i = 0; i < 3; i++) {
      const x = Math.round(i * tileW - offset);
      if (x >= this.canvasW || x + tileW <= 0) continue;
      this.renderer.draw(ctx, bgSrc, x, 0, tileW, tileH, i % 2 === 1);
    }
  }

  private drawIdleUI(): void {
    const { ctx, canvasW, canvasH } = this;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = FONT_LG;
    outlinedText(ctx, 'ROY RUNNER', canvasW / 2, canvasH * 0.2, C.parchment);

    // Blinking prompt and hint sit under the title, clear of Roy idling at the centre.
    if (this.blinkVisible) {
      ctx.font = FONT_MD;
      outlinedText(ctx, '▶ PRESS START', canvasW / 2, canvasH * 0.3, C.brass);
    }

    ctx.font = FONT_SM;
    outlinedText(ctx, 'SPACE, CLICK OR TAP', canvasW / 2, canvasH * 0.37, C.parchment);
  }

  private drawScoreHUD(): void {
    drawPlayerCard(this.ctx, this.renderer, { score: this.score, best: this.best });
  }

  private drawGameOverUI(): void {
    const { ctx, canvasW, canvasH } = this;

    // Semi-transparent overlay
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // GAME OVER
    ctx.font = FONT_LG;
    outlinedText(ctx, 'GAME OVER', canvasW / 2, canvasH * 0.32, C.danger);

    // Score
    ctx.font = FONT_MD;
    outlinedText(ctx, `SCORE  ${pad(this.score)}`, canvasW / 2, canvasH * 0.52, C.brass);

    // New best, or the best to beat
    ctx.font = FONT_SM;
    outlinedText(
      ctx,
      this.newBest ? 'NEW BEST!' : `BEST  ${pad(this.best)}`,
      canvasW / 2, canvasH * 0.6,
      this.newBest ? C.brass : C.parchment,
    );

    // Restart prompt
    ctx.font = FONT_SM;
    outlinedText(ctx, '▶ PRESS TO RESTART', canvasW / 2, canvasH * 0.72, C.parchment);
  }
}
