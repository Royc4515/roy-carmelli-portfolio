import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PixelIcon, { PIXEL_ICON_NAMES, pixelIconBitmap, type PixelIconName } from './PixelIcon';

const SPEC_SET = [
  'play', 'book', 'scroll', 'person', 'star', 'sword', 'potion', 'gear', 'mail', 'github',
  'linkedin', 'phone', 'joystick', 'sun', 'moon', 'download', 'external', 'code', 'copy', 'menu',
  'close', 'arrow-up', 'arrow-down', 'chevron', 'check', 'campfire', 'rotate-phone', 'trophy',
  'home',
];

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

  it('merges pixels into row runs (fewer rects than pixels) and covers every pixel', () => {
    for (const name of PIXEL_ICON_NAMES) {
      const { container, unmount } = render(<PixelIcon name={name} />);
      const rects = [...container.querySelectorAll('rect')];
      const inked = pixelIconBitmap(name).join('').replace(/\./g, '').length;
      const area = rects.reduce(
        (sum, r) => sum + Number(r.getAttribute('width')) * Number(r.getAttribute('height')),
        0,
      );
      expect(area, name).toBe(inked);
      expect(rects.length, name).toBeLessThan(inked);
      unmount();
    }
  });

  it('draws + pixels with the accent custom property', () => {
    const { container } = render(<PixelIcon name="potion" />);
    const groups = [...container.querySelectorAll('g')];
    expect(groups.map(g => g.getAttribute('fill'))).toEqual([
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
