import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './GameEngine';

/** The private bits the scoreboard depends on, reached without running the rAF loop. */
type EngineInternals = { score: number; best: number; newBest: boolean; triggerGameOver(): void };

const ctx = {} as CanvasRenderingContext2D;

describe('GameEngine scoreboard hooks', () => {
  it('reports a run start once per run, on the press that starts it', () => {
    const onRunStart = vi.fn();
    const engine = new GameEngine(ctx, { onRunStart });
    engine.handleInput(); // IDLE -> TRANSITION
    engine.handleInput(); // still in TRANSITION: no second start
    expect(onRunStart).toHaveBeenCalledTimes(1);
  });

  it('reports the whole score on game over and tracks a new best', () => {
    const onGameOver = vi.fn();
    const engine = new GameEngine(ctx, { onGameOver });
    const e = engine as unknown as EngineInternals;
    engine.setBest(100);

    e.score = 150.9;
    e.triggerGameOver();
    expect(onGameOver).toHaveBeenCalledWith(150);
    expect(e.newBest).toBe(true);
    expect(e.best).toBe(150);

    engine.handleInput(); // GAMEOVER -> IDLE resets the flag
    expect(e.newBest).toBe(false);
    e.score = 20;
    e.triggerGameOver();
    expect(e.newBest).toBe(false);
    expect(e.best).toBe(150);
  });

  it('ignores a best that is not a finite, non-negative number', () => {
    const engine = new GameEngine(ctx);
    const e = engine as unknown as EngineInternals;
    engine.setBest(42.7);
    for (const bad of [NaN, -1, Infinity]) engine.setBest(bad);
    expect(e.best).toBe(42);
  });
});
