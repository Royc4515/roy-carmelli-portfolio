import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameAudio } from './GameAudio';
import { SFX } from './sounds';

// A Web Audio stand-in that records what gets scheduled. jsdom has no AudioContext.
class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}
class FakeNode {
  connect = vi.fn((next: unknown) => next);
  disconnect = vi.fn();
}
class FakeSource extends FakeNode {
  type = '';
  frequency = new FakeParam();
  buffer: unknown = null;
  loop = false;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0;
  sampleRate = 8000;
  state: 'running' | 'suspended' | 'closed' = 'running';
  destination = new FakeNode();
  sources: FakeSource[] = [];
  resume = vi.fn(() => { this.state = 'running'; return Promise.resolve(); });
  suspend = vi.fn(() => { this.state = 'suspended'; return Promise.resolve(); });
  close = vi.fn(() => { this.state = 'closed'; return Promise.resolve(); });
  constructor() { FakeContext.instances.push(this); }
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam() }); }
  createOscillator() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

const lastContext = () => FakeContext.instances[FakeContext.instances.length - 1];

beforeEach(() => {
  FakeContext.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal('AudioContext', FakeContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('GameAudio', () => {
  it('is silent and harmless without Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new GameAudio();
    expect(() => {
      audio.play('jump');
      audio.startMusic();
      audio.setMuted(true);
      audio.setMuted(false);
      audio.setHidden(true);
      audio.stopMusic();
      audio.dispose();
    }).not.toThrow();
  });

  it('creates no audio context until the first sound, and none at all while muted', () => {
    const audio = new GameAudio(true);
    audio.play('start');
    audio.startMusic();
    expect(FakeContext.instances).toHaveLength(0);
    audio.setMuted(false); // the run is on: the music comes back
    expect(FakeContext.instances).toHaveLength(1);
    expect(lastContext().sources.length).toBeGreaterThan(0);
  });

  it('plays one source per layer of a cue, starting now', () => {
    const audio = new GameAudio();
    audio.play('slide');
    const ctx = lastContext();
    expect(ctx.sources).toHaveLength(SFX.slide.length);
    for (const source of ctx.sources) {
      expect(source.start).toHaveBeenCalledWith(0);
      expect(source.stop).toHaveBeenCalled();
    }
  });

  it('keeps scheduling music while a run is on and stops when it ends', () => {
    const audio = new GameAudio();
    audio.startMusic();
    const ctx = lastContext();
    const first = ctx.sources.length;
    expect(first).toBeGreaterThan(0);

    ctx.currentTime = 2;
    vi.advanceTimersByTime(100);
    const later = ctx.sources.length;
    expect(later).toBeGreaterThan(first);

    audio.stopMusic();
    ctx.currentTime = 4;
    vi.advanceTimersByTime(100);
    expect(ctx.sources.length).toBe(later);
  });

  it('never bursts the backlog after the clock jumps ahead', () => {
    const audio = new GameAudio();
    audio.startMusic();
    const ctx = lastContext();
    const before = ctx.sources.length;
    ctx.currentTime = 60; // a minute of missed steps
    vi.advanceTimersByTime(25);
    // Only the look-ahead window (one step, at most two) is scheduled, each a few voices.
    expect(ctx.sources.length - before).toBeLessThan(10);
  });

  it('suspends while muted or hidden and wakes up after', () => {
    const audio = new GameAudio();
    audio.play('jump');
    const ctx = lastContext();

    audio.setMuted(true);
    expect(ctx.suspend).toHaveBeenCalled();
    audio.play('jump');
    expect(ctx.sources).toHaveLength(SFX.jump.length);

    audio.setMuted(false);
    audio.setHidden(true);
    expect(ctx.state).toBe('suspended');
    audio.setHidden(false);
    expect(ctx.resume).toHaveBeenCalled();
    expect(ctx.state).toBe('running');
  });

  it('unlocks on a later gesture, and revives a context iOS interrupted', () => {
    const audio = new GameAudio();
    audio.unlock();
    const ctx = lastContext();
    (ctx as { state: string }).state = 'interrupted';
    audio.unlock();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe('running');
    audio.unlock(); // already running: nothing to do
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('does not open a context just because the page became visible', () => {
    const audio = new GameAudio();
    audio.setHidden(true);
    audio.setHidden(false);
    expect(FakeContext.instances).toHaveLength(0);
  });

  it('closes the context on dispose and stays silent', () => {
    const audio = new GameAudio();
    audio.startMusic();
    const ctx = lastContext();
    audio.dispose();
    expect(ctx.close).toHaveBeenCalled();
    const count = ctx.sources.length;
    audio.play('jump');
    audio.startMusic();
    vi.advanceTimersByTime(100);
    expect(ctx.sources.length).toBe(count);
    expect(FakeContext.instances).toHaveLength(1);
  });
});
