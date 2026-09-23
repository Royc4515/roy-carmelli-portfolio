import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Hero, {
  FOREST_BIRD_COLUMNS,
  HERO_CARD_W,
  HERO_FEET_COLUMN,
  chooseHeroLayout,
  computeHeroScene,
  containerContentLeft,
  placeOverlaySprite,
  sceneScale,
  titleCardTop,
} from './Hero';
import { bio } from '../data/bio';
import { pixelSprites } from '../theme/pixelSprites';

// framer-motion uses ResizeObserver — stub it
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/**
 * Mocks matchMedia for both hooks Hero relies on:
 *  - useIsMobile        → `(max-width: 767px)`        (layout)
 *  - useGameDisplayMode → `(pointer: coarse)` + `(orientation: portrait)` (game gate)
 */
function setupMatchMedia(opts: { mobileWidth: boolean; coarse: boolean; portrait: boolean }) {
  window.matchMedia = (query: string) => {
    let matches = false;
    if (query.includes('max-width')) matches = opts.mobileWidth;
    else if (query.includes('pointer: coarse')) matches = opts.coarse;
    else if (query.includes('orientation: portrait')) matches = opts.portrait;
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  };
}

/** The game is lazy-loaded: wait for its canvas. */
function findCanvas() {
  return waitFor(() => {
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    return canvas;
  });
}

describe('Hero — desktop', () => {
  beforeEach(() => {
    setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
    vi.restoreAllMocks();
  });

  it('renders the PRESS START button', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
  });

  it('renders the name as the only H1 and the role line from bio.role', () => {
    render(<Hero />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(bio.name);
    expect(screen.getByText(bio.role)).toBeInTheDocument();
  });

  it('links the CTAs to the projects zone and the resume PDF', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: /view projects/i })).toHaveAttribute('href', '#projects');
    const resume = screen.getByRole('link', { name: /resume/i });
    expect(resume).toHaveAttribute('href', bio.resume.href);
    expect(resume).toHaveAttribute('download', bio.resume.fileName);
    expect(screen.getByText(bio.availability)).toBeInTheDocument();
  });

  it('mounts MiniGame when PRESS START is clicked', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
  });

  it('does NOT render the rotate prompt on desktop', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });

  it('does NOT show the SLIDE touch button on desktop', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    expect(screen.queryByRole('button', { name: /^slide/i })).toBeNull();
  });

  it('starts the game on the arcade:play event (navbar Play)', async () => {
    render(<Hero />);
    fireEvent(window, new CustomEvent('arcade:play'));
    await findCanvas();
  });

  it('quits with Esc and hands focus back to PRESS START', async () => {
    render(<Hero />);
    const pressStart = screen.getByRole('button', { name: /press start/i });
    await userEvent.click(pressStart);
    await findCanvas();
    expect(screen.getByRole('region', { name: 'Roy Runner' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('canvas')).toBeNull());
    expect(screen.getByRole('button', { name: /press start/i })).toHaveFocus();
  });

  it('quits with the Quit button', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    await userEvent.click(screen.getByRole('button', { name: /^quit$/i }));
    await waitFor(() => expect(document.querySelector('canvas')).toBeNull());
  });
});

describe('Hero — phone portrait', () => {
  beforeEach(() => {
    setupMatchMedia({ mobileWidth: true, coarse: true, portrait: true });
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the PRESS START button on a phone', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
  });

  it('does NOT mount a canvas when PRESS START is clicked in portrait', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await screen.findByTestId('arcade-fallback-message');
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders the rotate prompt instead of the game in portrait', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(await screen.findByTestId('arcade-fallback-message')).toBeInTheDocument();
  });

  it('renders the waving character sprite on mobile (no player card)', () => {
    render(<Hero />);
    // The sprite is a sprite-sheet <div role="img"> (not an <img>) since step 02.
    expect(screen.getByRole('img', { name: /roy waving hello/i })).toBeInTheDocument();
    expect(screen.queryByAltText(/pixel avatar/i)).toBeNull();
  });
});

describe('Hero — phone landscape', () => {
  beforeEach(() => {
    // A landscape phone is typically wider than the 767px breakpoint.
    setupMatchMedia({ mobileWidth: false, coarse: true, portrait: false });
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('mounts the game (canvas) when PRESS START is clicked in landscape', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
  });

  it('shows the SLIDE touch button in landscape', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(await screen.findByRole('button', { name: /^slide/i })).toBeInTheDocument();
  });

  it('does NOT render the rotate prompt in landscape', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });
});

/* ── Scene geometry ──────────────────────────────────────────────────────── */

const { forest, wave } = pixelSprites;
/** Desktop scene sizes (viewport minus the 64px nav, hero capped at 880px). */
const DESKTOP_SCENES: Array<[number, number]> = [
  [1024, 704],
  [1280, 656],
  [1280, 736],
  [1366, 593],
  [1366, 704],
  [1440, 836],
  [1536, 800],
  [1920, 816],
  [2560, 816],
];

describe('hero scene geometry', () => {
  it('picks max(ceil(W/240), floor(H/112)) unless that makes Roy more than 60% of the scene', () => {
    expect(sceneScale(1280, 736)).toBe(6);
    expect(sceneScale(1440, 836)).toBe(7);
    expect(sceneScale(1024, 704)).toBe(6);
    expect(sceneScale(900, 636)).toBe(5);
    // Covering 1920 / 2560 px would take x8 / x11 (Roy 66% / 90%): stay height-driven.
    expect(sceneScale(1920, 816)).toBe(7);
    expect(sceneScale(2560, 816)).toBe(7);
  });

  it.each(DESKTOP_SCENES)('places forest and Roy on one integer grid at %ix%i', (w, h) => {
    const s = computeHeroScene('overlay', w, h);
    const { k } = s;
    expect(Number.isInteger(s.forestX) && Number.isInteger(s.spriteX)).toBe(true);
    // Feet on forest column 182, bottom edge on the grass line.
    expect(s.spriteX - s.forestX).toBe((HERO_FEET_COLUMN - wave.anchorX) * k);
    expect(h - s.groundH).toBe(s.forestY + forest.groundRow * k);
    // The forest (plus mirrored copies) covers the scene; the dirt fills any height below it.
    const left = s.mirrorLeft ? s.forestX - forest.w * k : s.forestX;
    const right = s.forestX + forest.w * k * (s.mirrorRight ? 2 : 1);
    expect(left).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(w);
    expect(s.forestY).toBeLessThanOrEqual(0);
    expect(s.forestY + forest.h * k + s.groundExtraH).toBe(h);
    // Roy is about half the scene, fully inside it and clear of the title card.
    const share = (wave.frameH * k) / h;
    expect(share).toBeGreaterThanOrEqual(0.5);
    expect(share).toBeLessThanOrEqual(0.6);
    const cardEdge = containerContentLeft(w) + HERO_CARD_W + 12;
    expect(s.spriteX).toBeGreaterThanOrEqual(cardEdge + 16);
    expect(s.spriteX + wave.frameW * k).toBeLessThanOrEqual(w);
    // No bird is sliced by the card's edge: each is behind it or clear of it (one column of slack).
    for (const [from, to] of FOREST_BIRD_COLUMNS) {
      const b0 = s.forestX + from * k;
      const b1 = s.forestX + to * k;
      const hidden = Math.min(Math.max(cardEdge - b0, 0), b1 - b0);
      expect(hidden === b1 - b0 || hidden <= k).toBe(true);
    }
    // The HUD fits above Roy's head at every common size.
    expect(s.hudClear).toBe(true);
  });

  it('leaves the HUD out when it would touch the title card', () => {
    expect(computeHeroScene('overlay', 900, 636).hudClear).toBe(true);
    expect(computeHeroScene('overlay', 844, 572).hudClear).toBe(false);
  });

  it('mirrors the forest only when one copy cannot cover the width', () => {
    const narrow = computeHeroScene('overlay', 1280, 736);
    expect(narrow.mirrorLeft || narrow.mirrorRight).toBe(false);
    const wide = computeHeroScene('overlay', 2560, 816);
    expect(wide.mirrorLeft || wide.mirrorRight).toBe(true);
  });

  it('deepens the ground when the forest is shorter than the scene', () => {
    const s = computeHeroScene('overlay', 1280, 736);
    expect(s.forestY).toBe(0);
    expect(s.groundExtraH).toBe(736 - forest.h * 6);
  });

  it('puts phones in a x3 band with Roy at about 60% of the width', () => {
    const s = computeHeroScene('stack', 390, 0);
    expect(s.k).toBe(3);
    expect(s.sceneH).toBe(forest.h * 3);
    expect(s.groundExtraH).toBe(0);
    expect(s.forestX).toBeLessThanOrEqual(0);
    expect(s.forestX + forest.w * 3).toBeGreaterThanOrEqual(390);
    const centre = s.spriteX + (wave.frameW * 3) / 2;
    expect(Math.abs(centre / 390 - 0.6)).toBeLessThan(0.02);
  });

  it('stacks on phones and narrow portrait tablets, overlays wherever Roy fits beside the card', () => {
    expect(chooseHeroLayout(390, 780, true)).toBe('stack');
    expect(chooseHeroLayout(768, 816, false)).toBe('stack');
    // A landscape phone keeps the name above the fold: the scene grows to fit the card.
    expect(chooseHeroLayout(844, 326, false)).toBe('overlay');
    expect(chooseHeroLayout(1024, 704, false)).toBe('overlay');
    expect(chooseHeroLayout(1280, 736, false)).toBe('overlay');
    expect(placeOverlaySprite(700, 700)).toBeNull();
  });

  it('centres the title card in the air above the grass on whole pixels, 16px from the top at least', () => {
    expect(titleCardTop(736, 130, 520)).toBe(43);
    expect(titleCardTop(593, 88, 520)).toBe(16);
    expect(Number.isInteger(titleCardTop(701, 99, 511))).toBe(true);
  });
});
