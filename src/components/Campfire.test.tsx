import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Campfire, { CAMPFIRE_CYCLE_MS, CAMPFIRE_FRAMES, CAMPFIRE_SIZE, campfireFrames } from './Campfire';

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

function sheetOf(container: HTMLElement) {
  const root = container.querySelector<HTMLElement>('.px-campfire')!;
  const svg = root.querySelector('svg')!;
  return { root, svg };
}

/** Paint the rendered rects back into bitmaps (one per frame) to compare with the source. */
function repaint(svg: SVGSVGElement): string[][] {
  const frames = Array.from({ length: CAMPFIRE_FRAMES }, () =>
    Array.from({ length: CAMPFIRE_SIZE }, () => Array<string>(CAMPFIRE_SIZE).fill('.')),
  );
  svg.querySelectorAll('g').forEach(g => {
    const ink = g.getAttribute('data-ink')!;
    g.querySelectorAll('rect').forEach(rect => {
      const x0 = Number(rect.getAttribute('x'));
      const y0 = Number(rect.getAttribute('y'));
      const w = Number(rect.getAttribute('width'));
      const h = Number(rect.getAttribute('height'));
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const frame = Math.floor(x / CAMPFIRE_SIZE);
          const cell = frames[frame][y][x % CAMPFIRE_SIZE];
          if (cell !== '.') throw new Error(`overlapping rects at ${x},${y}`);
          frames[frame][y][x % CAMPFIRE_SIZE] = ink;
        }
      }
    });
  });
  return frames.map(rows => rows.map(r => r.join('')));
}

describe('Campfire', () => {
  it('draws three 16×16 frames with at most five inks and a shared log pile', () => {
    const frames = campfireFrames();
    expect(frames).toHaveLength(3);
    const inks = new Set<string>();
    frames.forEach(frame => {
      expect(frame).toHaveLength(CAMPFIRE_SIZE);
      frame.forEach(row => {
        expect(row).toHaveLength(CAMPFIRE_SIZE);
        row.split('').forEach(ch => ch !== '.' && inks.add(ch));
      });
    });
    expect(inks.size).toBeLessThanOrEqual(5);
    // Only the flame moves: the bottom rows (logs) are identical, so the sprite stays planted.
    const base = (f: readonly string[]) => f.slice(11).join('\n');
    expect(base(frames[1])).toBe(base(frames[0]));
    expect(base(frames[2])).toBe(base(frames[0]));
    // It stands on the ground: the last row is not empty.
    expect(frames[0][CAMPFIRE_SIZE - 1].replace(/\./g, '')).not.toBe('');
  });

  it('renders the frames as one strip of rects that repaints to the exact bitmaps', () => {
    const { container } = render(<Campfire scale={4} />);
    const { svg } = sheetOf(container);
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 16');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(repaint(svg)).toEqual(campfireFrames().map(f => [...f]));
  });

  it('is decorative and sized to an integer scale', () => {
    const { container } = render(<Campfire scale={3} />);
    const { root, svg } = sheetOf(container);
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.style.getPropertyValue('--px-campfire-size')).toBe('48px');
    expect(root.style.getPropertyValue('--px-campfire-cycle')).toBe(`${CAMPFIRE_CYCLE_MS}ms`);
    expect(root.style.getPropertyValue('--px-campfire-frames')).toBe('3');
    expect(svg).toHaveAttribute('width', '144');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('rounds and clamps the scale to 1-4', () => {
    const big = render(<Campfire scale={9} />);
    expect(sheetOf(big.container).root).toHaveAttribute('data-scale', '4');
    const odd = render(<Campfire scale={1.6} />);
    expect(sheetOf(odd.container).svg).toHaveAttribute('height', '32');
    const bad = render(<Campfire scale={Number.NaN} />);
    expect(sheetOf(bad.container).root).toHaveAttribute('data-scale', '4');
  });

  it('pauses while the tab is hidden', () => {
    const { container } = render(<Campfire />);
    const { root } = sheetOf(container);
    expect(root).not.toHaveClass('px-campfire--paused');
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(root).toHaveClass('px-campfire--paused');
  });
});
