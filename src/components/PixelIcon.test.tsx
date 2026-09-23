import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PixelIcon, {
  PIXEL_ICON_NAMES,
  pixelIconBitmap,
  pixelIconPaths,
  type PixelIconName,
} from './PixelIcon';

const SPEC_SET = [
  'play', 'book', 'scroll', 'person', 'star', 'sword', 'potion', 'gear', 'mail', 'github',
  'linkedin', 'phone', 'joystick', 'sun', 'moon', 'download', 'external', 'code', 'copy', 'menu',
  'close', 'arrow-up', 'arrow-down', 'chevron', 'check', 'campfire', 'rotate-phone', 'trophy',
  'home', 'fullscreen', 'fullscreen-exit',
];

/** Paint a path made of `M x y h w v h h -w z` subpaths onto a 12x12 grid (count per pixel). */
function rasterize(d: string): number[][] {
  const grid = Array.from({ length: 12 }, () => Array<number>(12).fill(0));
  const subpath = /M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g;
  let consumed = 0;
  for (const m of d.matchAll(subpath)) {
    const [x, y, w, h, back] = m.slice(1).map(Number);
    expect(back).toBe(w);
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) grid[row][col] += 1;
    }
    consumed += m[0].length;
  }
  expect(consumed, 'every command is a closed rect subpath').toBe(d.length);
  return grid;
}

afterEach(() => vi.restoreAllMocks());

describe('PixelIcon', () => {
  it('ships the full icon set, each a 12x12 bitmap of . # +', () => {
    expect([...PIXEL_ICON_NAMES].sort()).toEqual([...SPEC_SET].sort());
    for (const name of PIXEL_ICON_NAMES) {
      const rows = pixelIconBitmap(name);
      expect(rows, name).toHaveLength(12);
      for (const row of rows) expect(row, name).toMatch(/^[.#+]{12}$/);
    }
  });

  it('renders a crisp 12x12 svg at 24px by default', () => {
    const { container } = render(<PixelIcon name="mail" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 12 12');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
  });

  it('renders at the requested size', () => {
    const { container } = render(<PixelIcon name="star" size={48} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '48');
  });

  it('is aria-hidden and has no role by default', () => {
    const { container } = render(<PixelIcon name="book" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg.querySelector('title')).toBeNull();
  });

  it('with a title it becomes an image with that accessible name', () => {
    render(<PixelIcon name="github" title="GitHub" />);
    const img = screen.getByRole('img', { name: 'GitHub' });
    expect(img).not.toHaveAttribute('aria-hidden');
    expect(img.querySelector('title')).toHaveTextContent('GitHub');
  });

  it('draws each ink as one path that covers exactly its pixels, once each', () => {
    for (const name of PIXEL_ICON_NAMES) {
      const { container, unmount } = render(<PixelIcon name={name} />);
      expect(container.querySelector('rect'), name).toBeNull();
      const paths = [...container.querySelectorAll('path')];
      const bitmap = pixelIconBitmap(name);
      const inks = (['#', '+'] as const).filter(ink => bitmap.join('').includes(ink));
      expect(paths, name).toHaveLength(inks.length);
      inks.forEach((ink, i) => {
        const d = paths[i].getAttribute('d')!;
        expect(d, name).toBe(pixelIconPaths(name)[ink]);
        const grid = rasterize(d);
        bitmap.forEach((row, y) =>
          [...row].forEach((cell, x) => expect(grid[y][x], `${name} ${ink} ${x},${y}`).toBe(cell === ink ? 1 : 0)),
        );
      });
      unmount();
    }
  });

  it('merges runs, so a path has fewer subpaths than inked pixels', () => {
    const d = pixelIconPaths('mail')['#'];
    const inked = pixelIconBitmap('mail').join('').replace(/\./g, '').length;
    expect(d.split('z').length - 1).toBeLessThan(inked);
  });

  it('draws + pixels with the accent custom property', () => {
    const { container } = render(<PixelIcon name="potion" />);
    const paths = [...container.querySelectorAll('path')];
    expect(paths.map(p => p.getAttribute('fill'))).toEqual([
      'currentColor',
      'var(--pi-accent, var(--color-hp, #ef7d70))',
    ]);
  });

  it('renders nothing and warns in development for an unknown name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<PixelIcon name={'nope' as PixelIconName} />);
    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown icon "nope"'));
  });
});
