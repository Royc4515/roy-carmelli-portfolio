import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  duration,
  ease,
  materialize,
  materializeDelay,
  MATERIALIZE_MAX_STAGGERED,
} from './motion';

// Read the stylesheet from disk: the Vitest config stubs CSS imports (css: false), even ?raw.
const indexCss = readFileSync(resolve(import.meta.dirname, '../index.css'), 'utf8');

function cssVar(name: string): string {
  const match = indexCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} not found in src/index.css`);
  return match[1].trim();
}

describe('motion tokens', () => {
  it('match the --dur-* custom properties in index.css', () => {
    for (const [name, ms] of Object.entries(duration)) {
      expect(cssVar(`dur-${name}`)).toBe(`${ms}ms`);
    }
  });

  it('match the --ease-* custom properties in index.css', () => {
    for (const [name, points] of Object.entries(ease)) {
      const css = cssVar(`ease-${name}`);
      const parsed = css
        .replace(/^cubic-bezier\(|\)$/g, '')
        .split(',')
        .map(Number);
      expect(parsed).toEqual([...points]);
    }
  });
});

describe('materialize', () => {
  it('staggers by 60ms and caps after the fourth item', () => {
    expect(materializeDelay(0)).toBe(0);
    expect(materializeDelay(1)).toBeCloseTo(0.06);
    expect(materializeDelay(3)).toBeCloseTo(0.18);
    expect(materializeDelay(MATERIALIZE_MAX_STAGGERED)).toBeCloseTo(0.18);
    expect(materializeDelay(20)).toBeCloseTo(0.18);
    expect(materializeDelay(-1)).toBe(0);
  });

  it('starts hidden 8px low and resolves to fully visible in place', () => {
    expect(materialize.hidden).toEqual({ opacity: 0, y: 8 });
    const visible = materialize.visible(2);
    expect(visible.opacity).toEqual([0, 0.33, 0.66, 1]);
    expect(visible.y).toBe(0);
    expect(visible.transition.opacity.duration).toBeCloseTo(0.24);
    expect(visible.transition.opacity.delay).toBeCloseTo(0.12);
    expect(visible.transition.y.delay).toBeCloseTo(0.12);
  });

  it('moves y in whole 2px steps', () => {
    const { ease: yEase } = materialize.visible().transition.y;
    const positions = [0.1, 0.3, 0.6, 0.9, 1].map(t => 8 - 8 * yEase(t));
    expect(positions).toEqual([6, 4, 2, 0, 0]);
  });
});
