/**
 * Roy Runner's music, written as text so it reads like a tracker: one token per eighth note.
 * A note is a name and octave (`A4`, `C#5`), `-` holds the previous note one more step and
 * `.` is a rest. Drums use `k` (kick), `n` (snare), `h` (hi-hat) and `.`.
 */

export interface NoteEvent {
  /** Step the note starts on. */
  step: number;
  /** How many steps it sounds for (1 + the holds after it). */
  steps: number;
  /** Pitch in Hz. */
  freq: number;
}

export interface Track {
  /** Steps in the pattern; it loops after the last one. */
  length: number;
  notes: readonly NoteEvent[];
}

export type Drum = 'kick' | 'snare' | 'hat';

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])(#?)(\d)$/;
const DRUMS: Record<string, Drum | null> = { k: 'kick', n: 'snare', h: 'hat', '.': null };

/** Equal-tempered frequency of a note name such as `A4` (440 Hz) or `C#5`. */
export function noteFrequency(name: string): number {
  const match = NOTE_RE.exec(name);
  if (!match) throw new Error(`Bad note "${name}"`);
  const [, letter, sharp, octave] = match;
  const midi = 12 * (Number(octave) + 1) + SEMITONES[letter] + (sharp ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

function tokens(bars: readonly string[]): string[] {
  return bars.join(' ').split(/\s+/).filter(Boolean);
}

/** Turns a melodic pattern into timed notes. Throws on a bad token, so a typo fails the tests. */
export function parseTrack(bars: readonly string[]): Track {
  const list = tokens(bars);
  const notes: NoteEvent[] = [];
  let current: NoteEvent | null = null;
  for (let step = 0; step < list.length; step++) {
    const token = list[step];
    if (token === '-') {
      if (!current) throw new Error(`Hold with nothing to hold at step ${step}`);
      current.steps += 1;
    } else if (token === '.') {
      current = null;
    } else {
      current = { step, steps: 1, freq: noteFrequency(token) };
      notes.push(current);
    }
  }
  return { length: list.length, notes };
}

/** One drum (or none) per step. */
export function parseDrums(bars: readonly string[]): (Drum | null)[] {
  return tokens(bars).map((token, step) => {
    if (!(token in DRUMS)) throw new Error(`Bad drum "${token}" at step ${step}`);
    return DRUMS[token];
  });
}

const AM = 'A2 A3 A2 A3 A2 A3 A2 A3';
const F = 'F2 F3 F2 F3 F2 F3 F2 F3';
const C = 'C3 C4 C3 C4 C3 C4 C3 C4';
const G = 'G2 G3 G2 G3 G2 G3 G2 G3';
const BEAT = 'k h n h k h n h';

/** An upbeat Am-F-C-G loop, 8 bars of 8 eighth notes (about 13 s at 150 BPM). */
export const SONG = {
  bpm: 150,
  lead: parseTrack([
    'A4 - C5 E5 - D5 C5 -',
    'A4 - F4 A4 C5 - A4 -',
    'G4 - C5 E5 - G5 E5 -',
    'D5 - B4 G4 - B4 D5 -',
    'E5 - A5 E5 - C5 A4 -',
    'F5 - C5 A4 - C5 F5 -',
    'E5 - G5 E5 - C5 E5 -',
    'D5 - G5 D5 B4 - G4 -',
  ]),
  bass: parseTrack([AM, F, C, G, AM, F, C, G]),
  drums: parseDrums(Array<string>(8).fill(BEAT)),
} as const;

/** Seconds per step (an eighth note). */
export const STEP_SECONDS = 60 / SONG.bpm / 2;
