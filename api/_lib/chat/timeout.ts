/** A step that did not answer in time. The work itself may still finish; its result is ignored. */
export class TimeoutError extends Error {
  constructor(readonly step: string) {
    super(`${step} timed out`);
    this.name = 'TimeoutError';
  }
}

/** Settles like `work`, or rejects with a TimeoutError after `ms`, whichever comes first. */
export function withTimeout<T>(work: Promise<T>, ms: number, step: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(step)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}
