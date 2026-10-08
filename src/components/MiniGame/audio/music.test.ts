import { describe, it, expect } from 'vitest';
import { SONG, STEP_SECONDS, noteFrequency, parseDrums, parseTrack } from './music';

describe('noteFrequency', () => {
  it('tunes A4 to 440 Hz and an octave to a doubling', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440);
    expect(noteFrequency('A5')).toBeCloseTo(880);
    expect(noteFrequency('C4')).toBeCloseTo(261.63, 1);
    expect(noteFrequency('C#4')).toBeCloseTo(277.18, 1);
  });

  it.each(['H4', 'A', 'a4', 'Ab4', 'A10', ''])('rejects %j', bad => {
    expect(() => noteFrequency(bad)).toThrow();
  });
});

describe('parseTrack', () => {
  it('turns holds into longer notes and rests into gaps', () => {
    const track = parseTrack(['A4 - - .', 'C5 E5 -']);
    expect(track.length).toBe(7);
    expect(track.notes.map(n => [n.step, n.steps])).toEqual([[0, 3], [4, 1], [5, 2]]);
  });

  it('rejects a hold with nothing to hold', () => {
    expect(() => parseTrack(['- A4'])).toThrow();
    expect(() => parseTrack(['A4 . -'])).toThrow();
  });
});

describe('parseDrums', () => {
  it('maps k, n and h to drums and . to silence', () => {
    expect(parseDrums(['k h n .'])).toEqual(['kick', 'hat', 'snare', null]);
    expect(() => parseDrums(['k x'])).toThrow();
  });
});

describe('SONG', () => {
  it('has lead, bass and drums of the same length, so the loop stays in time', () => {
    expect(SONG.lead.length).toBe(64);
    expect(SONG.bass.length).toBe(SONG.lead.length);
    expect(SONG.drums).toHaveLength(SONG.lead.length);
  });

  it('keeps every note inside the loop and in a comfortable range', () => {
    for (const note of [...SONG.lead.notes, ...SONG.bass.notes]) {
      expect(note.step + note.steps).toBeLessThanOrEqual(SONG.lead.length);
      expect(note.freq).toBeGreaterThan(80);
      expect(note.freq).toBeLessThan(1000);
    }
  });

  it('plays an eighth note at the song tempo', () => {
    expect(STEP_SECONDS).toBeCloseTo(0.2);
  });
});
