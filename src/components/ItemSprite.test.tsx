import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ItemSprite, {
  INKS,
  ITEMS,
  ITEM_SIZE,
  PROJECT_ITEMS,
  itemForProject,
  itemPaths,
  toLayers,
  toPath,
  type ItemName,
} from './ItemSprite';

const names = Object.keys(ITEMS) as ItemName[];
/** Fixed art colours (the SPEC's bitmap exception): the same object in both themes. */
const ART_INK = /^#[0-9a-f]{6}$/;

describe('ItemSprite bitmaps', () => {
  it.each(names)('%s is 24 x 24', name => {
    const rows = ITEMS[name];
    expect(rows).toHaveLength(ITEM_SIZE);
    rows.forEach(row => expect(row).toHaveLength(ITEM_SIZE));
  });

  it.each(names)('%s uses at most five known inks', name => {
    const used = new Set(ITEMS[name].join('').replace(/\./g, ''));
    expect(used.size).toBeLessThanOrEqual(5);
    used.forEach(ink => expect(INKS).toHaveProperty(ink));
  });

  it('draws every ink in a fixed art colour, never a theme token', () => {
    Object.values(INKS).forEach(value => expect(value).toMatch(ART_INK));
  });

  it.each(names)('%s has no stray single pixels', name => {
    const rows = ITEMS[name];
    const filled = (x: number, y: number) => rows[y]?.[x] !== undefined && rows[y][x] !== '.';
    const strays: string[] = [];
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === '.') return;
        const neighbours = [filled(x - 1, y), filled(x + 1, y), filled(x, y - 1), filled(x, y + 1)];
        if (!neighbours.some(Boolean)) strays.push(`${x},${y}`);
      }),
    );
    expect(strays).toEqual([]);
  });

  it('gives every project a distinct item', () => {
    const items = Object.values(PROJECT_ITEMS);
    expect(new Set(items).size).toBe(items.length);
    items.forEach(item => expect(names).toContain(item));
  });

  it('maps project ids to items and unknown ids to undefined', () => {
    expect(itemForProject('career-predictor')).toBe('crystal-ball');
    expect(itemForProject('sommelier-bot')).toBe('wine-glass');
    expect(itemForProject('white-matter-game')).toBe('brain');
    expect(itemForProject('ai-sidebar')).toBeUndefined();
    expect(itemForProject('toString')).toBeUndefined();
  });
});

describe('toLayers', () => {
  it('covers every filled pixel exactly once', () => {
    names.forEach(name => {
      const rows = ITEMS[name];
      const covered = new Map<string, string>();
      toLayers(rows).forEach(({ ink, rects }) =>
        rects.forEach(r => {
          for (let y = r.y; y < r.y + r.h; y += 1) {
            for (let x = r.x; x < r.x + r.w; x += 1) {
              const key = `${x},${y}`;
              expect(covered.has(key), `${name} overlaps at ${key}`).toBe(false);
              covered.set(key, ink);
            }
          }
        }),
      );
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => expect(covered.get(`${x},${y}`)).toBe(c === '.' ? undefined : c)),
      );
    });
  });

  it('merges runs into rects (a 2x2 block is one rect)', () => {
    const layers = toLayers(['##.', '##.', '...']);
    expect(layers).toEqual([{ ink: '#', rects: [{ x: 0, y: 0, w: 2, h: 2 }] }]);
  });
});

describe('toPath / itemPaths', () => {
  it('draws each rect as one closed subpath', () => {
    expect(toPath([])).toBe('');
    expect(
      toPath([
        { x: 0, y: 0, w: 2, h: 2 },
        { x: 5, y: 3, w: 1, h: 4 },
      ]),
    ).toBe('M0 0h2v2h-2zM5 3h1v4h-1z');
  });

  it.each(names)('%s has one path per ink and a silhouette of every filled pixel', name => {
    const rows = ITEMS[name];
    const inks = new Set(rows.join('').replace(/\./g, ''));
    const paths = itemPaths(name);
    expect(paths.inks.map(p => p.ink).sort()).toEqual([...inks].sort());
    const solid = rows.map(row => row.replace(/[^.]/g, '#'));
    expect(paths.silhouette).toBe(toPath(toLayers(solid)[0].rects));
  });
});

describe('<ItemSprite>', () => {
  it.each([
    [1, 24],
    [2, 48],
    [4, 96],
    [6, 144],
  ] as const)('renders at x%i as %ipx, crisp and pixelated', (scale, px) => {
    const { container } = render(<ItemSprite name="brain" scale={scale} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', String(px));
    expect(svg).toHaveAttribute('height', String(px));
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveClass('pixelated');
    expect(svg).toHaveAttribute('data-item', 'brain');
  });

  it('is decorative by default', () => {
    const { container } = render(<ItemSprite name="wine-glass" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('becomes an image with a name when given a title', () => {
    const { getByRole } = render(<ItemSprite name="wine-glass" title="Wine glass" />);
    expect(getByRole('img', { name: 'Wine glass' })).toBeInTheDocument();
  });

  it('draws one path per ink in its art colour, then the night wash', () => {
    const { container } = render(<ItemSprite name="crystal-ball" />);
    expect(container.querySelector('rect')).toBeNull();
    const paths = [...container.querySelectorAll('path')];
    const art = paths.slice(0, -1);
    expect(art.map(p => p.getAttribute('fill'))).toEqual(itemPaths('crystal-ball').inks.map(i => INKS[i.ink]));
    art.forEach(p => expect(p.getAttribute('fill')).toMatch(ART_INK));
    // The wash is the silhouette on top; its colour comes from CSS (fg-subtle, night only).
    const wash = paths[paths.length - 1];
    expect(wash).toHaveClass('item-sprite__wash');
    expect(wash).not.toHaveAttribute('fill');
    expect(wash).toHaveAttribute('d', itemPaths('crystal-ball').silhouette);
  });

  it('renders nothing for an unknown item', () => {
    const { container } = render(<ItemSprite name={'sword' as ItemName} />);
    expect(container).toBeEmptyDOMElement();
  });
});
