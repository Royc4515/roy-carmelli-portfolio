import {
  CANVAS_CONFIG, PLAYER_CONFIG, SCROLL_CONFIG,
  SCORE_CONFIG, SPRITE_PATHS,
} from './config';
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

// ─── Colours / fonts ──────────────────────────────────────────────────────────
const C = {
  darkGreen:   '#1a2e10',
  forestLight: '#4a6b2e',
  brass:       '#c9a24a',
  parchment:   '#e8d8a8',
  woodDark:    '#3a2818',
  overlay:     'rgba(10,20,6,0.72)',
} as const;

const FONT_SM  = '8px "Press Start 2P"';
const FONT_MD  = '10px "Press Start 2P"';
const FONT_LG  = '14px "Press Start 2P"';

// ─── GameEngine ───────────────────────────────────────────────────────────────

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

  private readonly canvasW: number;
  private readonly canvasH: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
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
      ...SPRITE_PATHS.obstacles.ground.map(o => o.src),
      ...SPRITE_PATHS.obstacles.air.map(o => o.src),
      SPRITE_PATHS.background,
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

  /** Called by the React component on Space / click */
  handleInput(): void {
    switch (this.state) {
      case 'IDLE':
        this.beginTransition();
        break;
      case 'PLAYING':
        this.player.jump();
        break;
      case 'GAMEOVER':
        this.resetGame();
        break;
      // TRANSITION input is ignored
    }
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
  }

  private triggerGameOver(): void {
    this.state = 'GAMEOVER';
    this.player.animState = 'stand';
  }

  private resetGame(): void {
    this.score       = 0;
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

    switch (this.state) {
      case 'IDLE':     this.drawIdleUI();     break;
      case 'PLAYING':  this.drawScore();      break;
      case 'GAMEOVER': this.drawGameOverUI(); break;
    }
  }

  private drawScrollingBackground(): void {
    const { ctx, canvasW, canvasH } = this;
    const bgSrc = SPRITE_PATHS.background;

    // Tile width matches canvas width for a seamless horizontal loop
    const offset = this.bgOffset % canvasW;
    this.renderer.draw(ctx, bgSrc, -offset,          0, canvasW, canvasH);
    this.renderer.draw(ctx, bgSrc, canvasW - offset,  0, canvasW, canvasH);
  }

  private drawIdleUI(): void {
    const { ctx, canvasW, canvasH } = this;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font      = FONT_LG;
    ctx.fillStyle = C.parchment;
    ctx.fillText('ROY RUNNER', canvasW / 2, canvasH * 0.2);

    // Blinking prompt
    if (this.blinkVisible) {
      ctx.font      = FONT_MD;
      ctx.fillStyle = C.brass;
      ctx.fillText('▶ PRESS START', canvasW / 2, canvasH * 0.78);
    }

    // Hint
    ctx.font      = FONT_SM;
    ctx.fillStyle = C.forestLight;
    ctx.fillText('SPACE or CLICK', canvasW / 2, canvasH * 0.91);
  }

  private drawScore(): void {
    const { ctx, canvasW } = this;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.font         = FONT_MD;
    ctx.fillStyle    = C.brass;
    ctx.fillText(String(Math.floor(this.score)).padStart(6, '0'), canvasW - 12, 12);
  }

  private drawGameOverUI(): void {
    const { ctx, canvasW, canvasH } = this;

    // Semi-transparent overlay
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // GAME OVER
    ctx.font      = FONT_LG;
    ctx.fillStyle = '#e05050';
    ctx.fillText('GAME OVER', canvasW / 2, canvasH * 0.32);

    // Score
    ctx.font      = FONT_MD;
    ctx.fillStyle = C.brass;
    ctx.fillText(`SCORE  ${Math.floor(this.score).toString().padStart(6, '0')}`, canvasW / 2, canvasH * 0.52);

    // Restart prompt
    ctx.font      = FONT_SM;
    ctx.fillStyle = C.parchment;
    ctx.fillText('▶ PRESS TO RESTART', canvasW / 2, canvasH * 0.72);
  }
}
