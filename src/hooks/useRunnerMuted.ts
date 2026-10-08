import { useSyncExternalStore } from 'react';
import { isRunnerMuted, subscribeRunnerMuted } from '../lib/runnerSound';

/** Roy Runner's mute switch (see `src/lib/runnerSound.ts`), re-rendering when it flips. */
export function useRunnerMuted(): boolean {
  return useSyncExternalStore(subscribeRunnerMuted, isRunnerMuted, () => false);
}
