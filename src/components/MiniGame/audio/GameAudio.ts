import type { GameCue } from '../types';
import { SONG, STEP_SECONDS, type NoteEvent } from './music';
import { DRUM_SOUNDS, SFX, type Sound, type SoundLayer } from './sounds';

/** Bus volumes. The music sits under the effects so a jump is always heard. */
const MASTER_VOLUME = 0.5;
const MUSIC_VOLUME = 0.28;
const SFX_VOLUME = 0.8;
const LEAD = { wave: 'square', gain: 0.09 } as const;
const BASS = { wave: 'triangle', gain: 0.26 } as const;

/** How far ahead the music is scheduled, and how often the scheduler wakes up. */
const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
/** Notes stop a little before the next one so repeated pitches are heard as separate notes. */
const NOTE_LENGTH = 0.92;
/** Envelope floor: exponential ramps cannot reach 0. */
const SILENT = 0.0001;

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Notes indexed by the step they start on, so the scheduler does one lookup per step. */
function byStep(notes: readonly NoteEvent[], length: number): (NoteEvent | undefined)[] {
  const steps = Array<NoteEvent | undefined>(length).fill(undefined);
  for (const note of notes) steps[note.step] = note;
  return steps;
}

interface Graph {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
  noise: AudioBuffer;
}

/**
 * Roy Runner's sound: synthesised effects for the engine's cues and a looping chiptune track
 * while a run is on. Built on the Web Audio API with no audio files.
 *
 * The AudioContext is only created on the first sound that is not muted, which always comes
 * from a key press or tap (browsers keep audio locked until one). Without Web Audio (old
 * browsers, jsdom) every method is a silent no-op, so the game never depends on sound.
 */
export class GameAudio {
  private graph: Graph | null = null;
  private muted: boolean;
  /** A run is on, so the music should play whenever sound is allowed. */
  private musicWanted = false;
  /** The tab is hidden: the context stays suspended until it shows again. */
  private hidden = false;
  /** Disposed, or the browser refused a context: stay silent for good. */
  private dead = false;

  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextStepAt = 0;

  private readonly lead = byStep(SONG.lead.notes, SONG.lead.length);
  private readonly bass = byStep(SONG.bass.notes, SONG.bass.length);

  constructor(muted = false) {
    this.muted = muted;
  }

  /** Plays the effect for an engine cue. */
  play(cue: GameCue): void {
    const graph = this.live();
    if (graph) this.playSound(SFX[cue], graph.sfx, graph.ctx.currentTime);
  }

  /** Starts the music from the top (a run began). */
  startMusic(): void {
    this.musicWanted = true;
    this.halt();
    this.step = 0;
    this.runMusic();
  }

  /** Stops the music (the run ended); notes already sounding fade out quickly. */
  stopMusic(): void {
    this.musicWanted = false;
    this.halt();
    if (this.graph) this.graph.music.gain.setTargetAtTime(0, this.graph.ctx.currentTime, 0.04);
  }

  /**
   * Called from every key press, click and finger lift while the game is open. Browsers only
   * let audio start inside one of those (iOS Safari does not count the touchstart that starts
   * a run), so this is what actually unlocks the sound; it also revives a context iOS
   * interrupted (a call, Siri). A no-op once the sound is running.
   */
  unlock(): void {
    this.live();
  }

  /** Mutes or unmutes everything. Unmuting mid-run picks the music back up. */
  setMuted(muted: boolean): void {
    if (muted === this.muted) return;
    this.muted = muted;
    if (muted) {
      this.halt();
      this.suspend();
    } else if (this.musicWanted) {
      this.runMusic();
    }
  }

  /** The page was hidden or shown: hold the sound (and the music's clock) while it is hidden. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) this.suspend();
    // Only wake a context that already exists: creating one here, outside a key press or
    // tap, would just leave it locked.
    else if (this.graph) this.live();
  }

  /** Releases the audio device; the instance stays silent afterwards. */
  dispose(): void {
    this.dead = true;
    this.musicWanted = false;
    this.halt();
    const ctx = this.graph?.ctx;
    this.graph = null;
    ctx?.close().catch(() => {});
  }

  // ── Context ────────────────────────────────────────────────────────────────

  /** The running graph, created on first use; null while muted, hidden, disposed or unsupported. */
  private live(): Graph | null {
    if (this.muted || this.hidden || this.dead) return null;
    if (!this.graph) this.graph = this.build();
    const ctx = this.graph?.ctx;
    // Not just 'suspended': iOS reports 'interrupted', and a suspend() still in flight reads
    // 'running' only until it lands, so ask for a resume whenever it is not plainly running.
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
    return this.graph;
  }

  private build(): Graph | null {
    const Ctor = audioContextCtor();
    if (!Ctor) {
      this.dead = true;
      return null;
    }
    try {
      const ctx = new Ctor();
      const master = this.bus(ctx, MASTER_VOLUME, ctx.destination);
      return {
        ctx,
        music: this.bus(ctx, MUSIC_VOLUME, master),
        sfx: this.bus(ctx, SFX_VOLUME, master),
        noise: this.noiseBuffer(ctx),
      };
    } catch {
      // Too many contexts, or audio blocked by policy: play on in silence.
      this.dead = true;
      return null;
    }
  }

  private bus(ctx: AudioContext, volume: number, to: AudioNode): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(to);
    return gain;
  }

  /** Half a second of white noise, looped by every noise layer. */
  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate / 2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private suspend(): void {
    this.graph?.ctx.suspend().catch(() => {});
  }

  // ── Music ──────────────────────────────────────────────────────────────────

  private runMusic(): void {
    const graph = this.live();
    if (!graph || this.timer !== null) return;
    const now = graph.ctx.currentTime;
    graph.music.gain.cancelScheduledValues(now);
    graph.music.gain.setValueAtTime(MUSIC_VOLUME, now);
    this.nextStepAt = now + 0.05;
    this.tick();
    this.timer = setInterval(this.tick, TICK_MS);
  }

  private halt(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Schedules every step that starts within the look-ahead window on the audio clock, so the
   * beat stays steady even when the timer fires late.
   */
  private readonly tick = (): void => {
    const graph = this.graph;
    if (!graph) return;
    const now = graph.ctx.currentTime;
    // A late timer (busy main thread, a context just resumed) skips ahead instead of
    // playing the missed steps all at once.
    if (this.nextStepAt < now) this.nextStepAt = now + 0.02;
    while (this.nextStepAt < now + LOOKAHEAD_S) {
      this.playStep(graph, this.step, this.nextStepAt);
      this.step = (this.step + 1) % SONG.lead.length;
      this.nextStepAt += STEP_SECONDS;
    }
  };

  private playStep(graph: Graph, step: number, at: number): void {
    const lead = this.lead[step];
    if (lead) this.playNote(graph, lead, LEAD, at);
    const bass = this.bass[step % SONG.bass.length];
    if (bass) this.playNote(graph, bass, BASS, at);
    const drum = SONG.drums[step % SONG.drums.length];
    if (drum) this.playSound(DRUM_SOUNDS[drum], graph.music, at);
  }

  /** A held note: quick attack, flat sustain, short release. */
  private playNote(
    graph: Graph,
    note: NoteEvent,
    voice: { wave: OscillatorType; gain: number },
    at: number,
  ): void {
    const { ctx, music } = graph;
    const end = at + note.steps * STEP_SECONDS * NOTE_LENGTH;
    const osc = ctx.createOscillator();
    osc.type = voice.wave;
    osc.frequency.setValueAtTime(note.freq, at);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(voice.gain, at + 0.01);
    env.gain.setValueAtTime(voice.gain, Math.max(at + 0.01, end - 0.04));
    env.gain.linearRampToValueAtTime(0, end);
    osc.connect(env).connect(music);
    osc.onended = () => env.disconnect();
    osc.start(at);
    osc.stop(end + 0.01);
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  private playSound(sound: Sound, bus: GainNode, start: number): void {
    for (const layer of sound) this.playLayer(layer, bus, start);
  }

  /** One tone or noise layer: its sweep and a decay to silence over its length. */
  private playLayer(layer: SoundLayer, bus: GainNode, start: number): void {
    const graph = this.graph;
    if (!graph) return;
    const { ctx } = graph;
    const at = start + layer.at;
    const end = at + layer.dur;

    const env = ctx.createGain();
    env.gain.setValueAtTime(layer.gain, at);
    env.gain.exponentialRampToValueAtTime(SILENT, end);
    env.connect(bus);

    let source: AudioScheduledSourceNode;
    let sweep: AudioParam;
    if (layer.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = layer.wave;
      osc.connect(env);
      source = osc;
      sweep = osc.frequency;
    } else {
      const noise = ctx.createBufferSource();
      noise.buffer = graph.noise;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = layer.filter;
      noise.connect(filter).connect(env);
      source = noise;
      sweep = filter.frequency;
    }
    sweep.setValueAtTime(layer.from, at);
    if (layer.to !== undefined) sweep.exponentialRampToValueAtTime(layer.to, end);

    source.onended = () => env.disconnect();
    source.start(at);
    source.stop(end + 0.01);
  }
}
