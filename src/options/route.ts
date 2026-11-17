/**
 * The design options (docs/portfolio-options/OPTIONS.md) live behind a query switch:
 * "/?options" is the chooser, "/?option=a" one option. Option F is also the live site at "/",
 * and the earlier pixel site is kept at "/?classic" (see `isClassicRoute`).
 */
export const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export type OptionRoute = { kind: 'chooser' } | { kind: 'option'; key: OptionKey };

function isOptionKey(value: string): value is OptionKey {
  return (OPTION_KEYS as readonly string[]).includes(value);
}

/** `null` means the normal site. An unknown `?option=` value falls back to the chooser. */
export function readOptionRoute(search: string): OptionRoute | null {
  const params = new URLSearchParams(search);
  const raw = params.get('option');
  if (raw !== null) {
    const key = raw.trim().toLowerCase();
    return isOptionKey(key) ? { kind: 'option', key } : { kind: 'chooser' };
  }
  return params.has('options') ? { kind: 'chooser' } : null;
}

/** The pixel-RPG site that was live before option F, kept reachable at "/?classic". */
export function isClassicRoute(search: string): boolean {
  return new URLSearchParams(search).has('classic');
}

export const CLASSIC_HREF = '/?classic';

export const optionHref = (key: OptionKey) => `/?option=${key}`;
export const CHOOSER_HREF = '/?options';
