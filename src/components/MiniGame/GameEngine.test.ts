import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './GameEngine';

/** The private bits the scoreboard depends on, reached without running the rAF loop. */
type EngineInternals = {
  score: number;
  best: number;
  newBest: boolean;
  state: string;
  triggerGameOver(): void;
  updatePlaying(dt: number): void;
};

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

describe('GameEngine sound cues', () => {
  /** An engine already in a run, with its cues recorded. */
  function playing() {
    const onCue = vi.fn();
    const engine = new GameEngine(ctx, { onCue });
    engine.handleInput(); // IDLE -> TRANSITION
    const e = engine as unknown as EngineInternals;
    e.state = 'PLAYING';
    return { engine, e, onCue };
  }

  it('keeps playing when the sound throws', () => {
    const engine = new GameEngine(ctx, { onCue: () => { throw new Error('InvalidStateError'); } });
    expect(() => engine.handleInput()).not.toThrow();
    expect((engine as unknown as EngineInternals).state).toBe('TRANSITION');
  });

  it('cues the start of a run once', () => {
    const { engine, onCue } = playing();
    expect(onCue.mock.calls).toEqual([['start']]);
    engine.handleSlide();
    expect(onCue).toHaveBeenLastCalledWith('slide');
  });

  it('cues a jump only when Roy leaves the ground', () => {
    const { engine, onCue } = playing();
    engine.handleInput();
    engine.handleInput(); // already in the air: no second jump
    expect(onCue.mock.calls.filter(([c]) => c === 'jump')).toHaveLength(1);
  });

  it('cues a slide only when one starts', () => {
    const { engine, onCue } = playing();
    engine.handleSlide();
    engine.handleSlide(); // already sliding
    expect(onCue.mock.calls.filter(([c]) => c === 'slide')).toHaveLength(1);
  });

  it('cues each milestone once as the score passes it', () => {
    const { e, onCue } = playing();
    e.score = 99;
    e.updatePlaying(0.2); // 99 -> 100.6
    e.updatePlaying(0.2); // 100.6 -> 102.2
    expect(onCue.mock.calls.filter(([c]) => c === 'milestone')).toHaveLength(1);
  });

  it('cues the crash, and a new best after it', () => {
    const { engine, e, onCue } = playing();
    engine.setBest(10);
    e.score = 50;
    onCue.mockClear();
    e.triggerGameOver();
    expect(onCue.mock.calls).toEqual([['crash'], ['newBest']]);

    engine.handleInput(); // restart
    engine.handleInput();
    e.state = 'PLAYING';
    e.score = 5;
    onCue.mockClear();
    e.triggerGameOver();
    expect(onCue.mock.calls).toEqual([['crash']]);
  });
});
