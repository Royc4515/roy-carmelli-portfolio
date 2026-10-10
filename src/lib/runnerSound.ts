/**
 * Roy Runner's sound switch, shared by the controls outside the lazy game chunk (Hero's
 * desktop row) and the audio inside it, so both always agree. Sound is on unless the visitor
 * turned it off; that choice is remembered across visits.
 */

export const SOUND_STORAGE_KEY = 'roy-runner-sound';

type Listener = () => void;

const listeners = new Set<Listener>();
/** Read from storage on first use; `null` until then. */
let muted: boolean | null = null;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'off';
  } catch {
    // Storage blocked (private mode, sandboxed iframe): sound defaults to on.
    return false;
  }
}

export function isRunnerMuted(): boolean {
  if (muted === null) muted = typeof window === 'undefined' ? false : readStored();
  return muted;
}

export function setRunnerMuted(next: boolean): void {
  if (next === isRunnerMuted()) return;
  muted = next;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, next ? 'off' : 'on');
  } catch {
    // Not persisted; the choice still holds for this visit.
  }
  listeners.forEach(fn => fn());
}

export function toggleRunnerMuted(): void {
  setRunnerMuted(!isRunnerMuted());
}

/** Calls `fn` whenever the switch flips; returns the unsubscribe. */
export function subscribeRunnerMuted(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
