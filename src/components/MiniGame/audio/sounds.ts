import type { GameCue } from '../types';
import { noteFrequency, type Drum } from './music';

/**
 * Sound effects as recipes: layers of oscillator tones and filtered noise, each with a pitch
 * (or filter) sweep and a decaying envelope. Synthesised at play time, so the game ships no
 * audio files and the sounds match the chiptune music.
 */

interface LayerBase {
  /** Start, in seconds after the sound is triggered. */
  at: number;
  /** Length in seconds; the envelope decays to silence over it. */
  dur: number;
  /** Peak gain (0..1) before the bus volumes. */
  gain: number;
  /** Start frequency in Hz (the pitch for a tone, the filter cutoff for noise). */
  from: number;
  /** End frequency, reached at `at + dur`; omit to hold `from`. */
  to?: number;
}

export interface ToneLayer extends LayerBase {
  kind: 'tone';
  wave: OscillatorType;
}

export interface NoiseLayer extends LayerBase {
  kind: 'noise';
  filter: BiquadFilterType;
}

export type SoundLayer = ToneLayer | NoiseLayer;
export type Sound = readonly SoundLayer[];

function tone(wave: OscillatorType, from: number, dur: number, gain: number, rest: Partial<ToneLayer> = {}): ToneLayer {
  return { kind: 'tone', wave, from, dur, gain, at: 0, ...rest };
}

function noise(filter: BiquadFilterType, from: number, dur: number, gain: number, rest: Partial<NoiseLayer> = {}): NoiseLayer {
  return { kind: 'noise', filter, from, dur, gain, at: 0, ...rest };
}

/** Rising notes, one every `step` seconds; the last one rings three times as long. */
function arpeggio(notes: readonly string[], step: number, gain: number, startAt = 0): ToneLayer[] {
  return notes.map((name, i) =>
    tone('square', noteFrequency(name), i === notes.length - 1 ? step * 3 : step, gain, { at: startAt + i * step }),
  );
}

export const SFX: Record<GameCue, Sound> = {
  start: arpeggio(['C5', 'E5', 'G5', 'C6'], 0.06, 0.2),
  jump: [tone('square', 280, 0.14, 0.18, { to: 620 })],
  slide: [
    noise('bandpass', 2200, 0.2, 0.35, { to: 500 }),
    tone('triangle', 300, 0.16, 0.2, { to: 120 }),
  ],
  // The classic coin: a short B then a ringing E.
  milestone: [
    tone('square', noteFrequency('B5'), 0.07, 0.14),
    tone('square', noteFrequency('E6'), 0.24, 0.14, { at: 0.07 }),
  ],
  crash: [
    noise('lowpass', 1600, 0.35, 0.5, { to: 200 }),
    tone('square', 330, 0.5, 0.2, { to: 70 }),
  ],
  // Plays with the crash, so it waits for the thud to die down.
  newBest: arpeggio(['C5', 'E5', 'G5', 'C6'], 0.09, 0.18, 0.55),
};

export const DRUM_SOUNDS: Record<Drum, Sound> = {
  kick: [tone('sine', 160, 0.14, 0.55, { to: 40 })],
  snare: [noise('bandpass', 1800, 0.1, 0.22)],
  hat: [noise('highpass', 7000, 0.035, 0.1)],
};
