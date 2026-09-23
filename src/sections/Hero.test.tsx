import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Hero, {
  FOREST_BIRD_COLUMNS,
  HERO_BAND_SHARE,
  HERO_CARD_W,
  HERO_FEET_COLUMN,
  HERO_NAV_H,
  SVH_PROBE_ID,
  chooseHeroLayout,
  compactOverlayFit,
  computeHeroScene,
  containerContentLeft,
  heroHeight,
  isTightCard,
  placeOverlaySprite,
  planHero,
  sceneScale,
  titleCardTop,
} from './Hero';
import { ToastProvider } from '../components/ui/Toast';
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

/** jsdom's window is 1024x768; phone tests resize it (the hero reads innerWidth, and innerHeight
 *  wherever its 100svh probe measures nothing, as in jsdom). */
function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
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

  it('jumps back to the hero if arcade:play arrives while it is off-screen', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    try {
      render(<Hero />);
      const hero = document.getElementById('hero')!;
      hero.getBoundingClientRect = () => ({ top: -2900 }) as DOMRect;
      fireEvent(window, new CustomEvent('arcade:play'));
      expect(scrollTo).toHaveBeenCalledWith({ top: window.scrollY - 2900, behavior: 'instant' });
      await findCanvas();
    } finally {
      scrollTo.mockRestore();
    }
  });

  it('brings the hero to the top before locking the scroll when PRESS START is clicked on a scrolled page', async () => {
    const overflowAtScroll: string[] = [];
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => overflowAtScroll.push(document.body.style.overflow));
    try {
      render(<Hero />);
      const hero = document.getElementById('hero')!;
      hero.getBoundingClientRect = () => ({ top: -300 }) as DOMRect;
      await userEvent.click(screen.getByRole('button', { name: /press start/i }));
      expect(scrollTo).toHaveBeenCalledWith({ top: window.scrollY - 300, behavior: 'instant' });
      // The jump happens while the page can still scroll.
      expect(overflowAtScroll).toEqual(['']);
      await findCanvas();
      expect(document.body.style.overflow).toBe('hidden');
    } finally {
      scrollTo.mockRestore();
    }
  });

  it('does not scroll when PRESS START is clicked with the hero already at the top', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    try {
      render(<Hero />);
      await userEvent.click(screen.getByRole('button', { name: /press start/i }));
      await findCanvas();
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      scrollTo.mockRestore();
    }
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

  it('pops the same "Loot acquired" toast as the Resume zone when the Resume CTA is clicked', async () => {
    render(
      <ToastProvider>
        <Hero />
      </ToastProvider>,
    );
    const resume = screen.getByRole('link', { name: /resume/i });
    // Keep jsdom from trying to navigate to the PDF.
    resume.addEventListener('click', e => e.preventDefault());
    await userEvent.click(resume);
    expect(screen.getByRole('status')).toHaveTextContent(`Loot acquired: ${bio.resume.fileName}`);
  });

  it('makes the rest of the page inert while the game plays, and restores it on quit', async () => {
    render(
      <>
        <main>
          <Hero />
          <section id="projects">
            <a href="#x">Quest</a>
          </section>
          {/* React 18 has no typed inert prop: pass the attribute as a string. */}
          <section id="contact" {...{ inert: '' }}>
            <a href="#y">Already inert</a>
          </section>
        </main>
        <footer>Footer</footer>
      </>,
    );
    const projects = document.getElementById('projects')!;
    const footer = document.querySelector('footer')!;
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    expect(projects).toHaveAttribute('inert');
    expect(footer).toHaveAttribute('inert');
    expect(document.getElementById('hero')).not.toHaveAttribute('inert');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('canvas')).toBeNull());
    expect(projects).not.toHaveAttribute('inert');
    expect(footer).not.toHaveAttribute('inert');
    // Only what the game changed is restored.
    expect(document.getElementById('contact')).toHaveAttribute('inert');
  });

  it('leaves the game when an in-page link outside the hero is followed, keeping focus on it', async () => {
    render(
      <>
        <header>
          <a href="#projects">Projects</a>
        </header>
        <main>
          <Hero />
          <section id="projects">Quests</section>
        </main>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    const link = screen.getByRole('link', { name: 'Projects' });
    await userEvent.click(link);
    await waitFor(() => expect(document.querySelector('canvas')).toBeNull());
    expect(document.getElementById('projects')).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: /press start/i })).not.toHaveFocus();
  });

  it('shows the controls next to Esc while playing, with pixel icons instead of arrow glyphs', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await findCanvas();
    const game = screen.getByRole('region', { name: 'Roy Runner' });
    expect(game).toHaveTextContent('Esc');
    expect(game).toHaveTextContent(/Space\s*\/ click to jump/);
    expect(game).toHaveTextContent(/Down arrow\s*to slide/);
    expect(game.querySelector('svg[data-icon="arrow-down"]')).not.toBeNull();
    expect(game.textContent).not.toMatch(/[\u2190-\u21ff]/u);
  });

  it('keeps desktop play inside the first screen under the nav, the controls row never shrinking', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    const canvas = await findCanvas();
    const game = screen.getByRole('region', { name: 'Roy Runner' });
    // The area stops at the fold (jsdom has no layout: the geometry is checked in a browser).
    expect(game).toHaveClass('top-16', 'max-h-[calc(100svh-4rem)]', '@container', 'flex-col');
    // The canvas sits in the shrinkable screen box; the Quit row keeps its height.
    expect(canvas!.parentElement).toHaveClass('minigame-desk');
    expect(screen.getByRole('button', { name: /^quit$/i }).closest('.shrink-0')).not.toBeNull();
  });

  it('draws the HUD meters on the 4px grid (8x12 segments, 4px apart)', () => {
    const { container } = render(<Hero />);
    const segments = container.querySelectorAll('[data-meter-segment]');
    expect(segments).toHaveLength(16);
    segments.forEach(seg => expect(seg).toHaveClass('h-3', 'w-2'));
    expect(segments[0].parentElement).toHaveClass('gap-1');
  });
});

describe('Hero — phone portrait', () => {
  beforeEach(() => {
    setupMatchMedia({ mobileWidth: true, coarse: true, portrait: true });
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    setViewport(390, 844);
  });
  afterEach(() => setViewport(1024, 768));

  it('stacks the band over the card and orders the card for the fold: name, role, chip, CTAs, tagline', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('#hero')).toHaveAttribute('data-layout', 'stack');
    const text = container.querySelector('#hero')!.textContent!;
    const at = (needle: string) => text.indexOf(needle);
    expect(at(bio.role)).toBeGreaterThan(at('Carmelli'));
    expect(at(bio.availability)).toBeGreaterThan(at(bio.role));
    expect(at('View projects')).toBeGreaterThan(at(bio.availability));
    expect(at(bio.tagline)).toBeGreaterThan(at('Resume'));
    expect(at('Press start to play')).toBeGreaterThan(at(bio.tagline));
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
    // A landscape phone gets the compact title screen (CTAs above the fold).
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

  it('pins the title card top to the HUD top (16px) when the HUD is on screen', () => {
    expect(titleCardTop(736, 130, 520, true)).toBe(16);
    expect(titleCardTop(836, 129, 520, true)).toBe(16);
  });
});

describe('hero height', () => {
  it('fills the viewport up to 880px, and a viewport less than 96px taller than that', () => {
    expect(heroHeight(657)).toBe(657);
    expect(heroHeight(800)).toBe(800);
    expect(heroHeight(880)).toBe(880);
    expect(heroHeight(900)).toBe(900);
    expect(heroHeight(975)).toBe(975);
    expect(heroHeight(976)).toBe(880);
    expect(heroHeight(1080)).toBe(880);
  });

  it('keeps the desktop scale when a 900px-tall viewport is filled (1440x900 stays x7)', () => {
    const s = computeHeroScene('overlay', 1440, heroHeight(900) - HERO_NAV_H);
    expect(s.k).toBe(7);
    expect(s.forestY).toBe(0);
    expect(s.hudClear).toBe(true);
  });
});

/* ── Small and short viewports (P1-04) ─────────────────────────────────── */

describe('tight title card (short laptop screens)', () => {
  it.each([
    // Windows at 175% / 150% with tabs and bookmarks bar, a 1366x768 laptop in a browser.
    [516, HERO_CARD_W, true],
    [560, HERO_CARD_W, true],
    [602, HERO_CARD_W, true],
    [650, HERO_CARD_W, false],
    [830, HERO_CARD_W, false],
    // A compact card too narrow for the one-line name keeps the two-line layout.
    [516, 400, false],
  ])('viewport %ipx tall, card %ipx → tight %s', (vh, cardW, tight) => {
    expect(isTightCard(vh, cardW)).toBe(tight);
  });

  describe('rendered at 1097x516 (Windows 175%)', () => {
    beforeEach(() => {
      setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
      setViewport(1097, 516);
    });
    afterEach(() => setViewport(1024, 768));

    it('puts the name on one line and the CTAs right under the role', () => {
      render(<Hero />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveClass('hero-name--tight');
      const role = screen.getByText(bio.role);
      const cta = screen.getByRole('link', { name: /view projects/i });
      const tagline = screen.getByText(bio.tagline);
      // Document order: role, CTAs, then the tagline.
      expect(role.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(cta.compareDocumentPosition(tagline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Every piece of content is still there.
      expect(screen.getByText(bio.availability)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
    });
  });

  it('keeps the two-line name on taller screens', () => {
    setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
    setViewport(1280, 800);
    try {
      render(<Hero />);
      expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('hero-name--tight');
    } finally {
      setViewport(1024, 768);
    }
  });
});

describe('hero layout per viewport', () => {
  it.each([
    [1280, 800, false, 'overlay', false],
    [1440, 900, false, 'overlay', false],
    [1920, 1080, false, 'overlay', false],
    [1024, 768, false, 'overlay', false],
    [1366, 657, false, 'overlay', false],
    [390, 844, true, 'stack', false],
    [360, 740, true, 'stack', false],
    [768, 1024, false, 'stack', false],
    // The smaller title card (density pass) fits the full title screen at 800x600.
    [800, 600, false, 'overlay', false],
    // Real laptop viewports: 14" at 150% and 125% Windows scaling, 14" MacBook.
    [1280, 650, false, 'overlay', false],
    [1536, 730, false, 'overlay', false],
    [1470, 830, false, 'overlay', false],
    // A phone with the browser bars showing.
    [390, 664, true, 'stack', false],
    [844, 390, false, 'overlay', true],
    [640, 400, true, 'overlay', true],
    [667, 375, true, 'overlay', true],
  ] as const)('%ix%i (mobile %s) → %s, compact %s', (w, h, mobile, layout, compact) => {
    expect(planHero(w, h, mobile)).toEqual({ layout, compact });
  });
});

describe('viewport height: 100svh, not innerHeight', () => {
  /** Makes the hidden 100svh probe report `height` (jsdom lays nothing out). */
  function setSmallViewportHeight(height: number) {
    const probe = document.getElementById(SVH_PROBE_ID)!;
    probe.getBoundingClientRect = () => ({ height }) as DOMRect;
  }
  const sceneHeight = () => document.querySelector<HTMLElement>('#hero .hero-scene')!.style.height;
  const resize = (width: number, innerHeight: number, svh: number) =>
    act(() => {
      setViewport(width, innerHeight);
      setSmallViewportHeight(svh);
      window.dispatchEvent(new Event('resize'));
    });

  beforeEach(() => setupMatchMedia({ mobileWidth: true, coarse: true, portrait: true }));
  afterEach(() => {
    setViewport(1024, 768);
    // The probe outlives a render: drop the stubbed one so later renders measure afresh.
    document.getElementById(SVH_PROBE_ID)?.remove();
  });

  it('keeps the phone band when the URL bar collapses (innerHeight grows, 100svh does not)', () => {
    setViewport(390, 664);
    render(<Hero />);
    expect(document.getElementById(SVH_PROBE_ID)).toHaveAttribute('aria-hidden', 'true');
    resize(390, 664, 664);
    const band = computeHeroScene('stack', 390, 0, { viewportH: 664 }).sceneH;
    expect(sceneHeight()).toBe(`${band}px`);
    // 390x664 -> 390x750 as the bar hides: innerHeight alone would re-plan the band at x3.
    expect(computeHeroScene('stack', 390, 0, { viewportH: 750 }).sceneH).not.toBe(band);
    resize(390, 750, 664);
    expect(sceneHeight()).toBe(`${band}px`);
    resize(390, 664, 664);
    expect(sceneHeight()).toBe(`${band}px`);
  });

  it('re-plans the band when the viewport really changes (a resize or rotation moves 100svh too)', () => {
    setViewport(390, 664);
    render(<Hero />);
    resize(390, 664, 664);
    resize(390, 844, 844);
    expect(sceneHeight()).toBe(`${computeHeroScene('stack', 390, 0, { viewportH: 844 }).sceneH}px`);
  });

  it('plans the desktop title screen from 100svh as well', () => {
    setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
    setViewport(1097, 516);
    render(<Hero />);
    resize(1097, 516, 516);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('hero-name--tight');
    // A window made taller changes 100svh: the tight card gives way to the full one.
    resize(1097, 800, 800);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('hero-name--tight');
  });
});

describe('band (stacked) geometry', () => {
  const band = (w: number, vh: number) => computeHeroScene('stack', w, 0, { viewportH: vh });

  it.each([
    [360, 740, 3],
    [390, 844, 3],
    [375, 600, 2],
    [768, 1024, 4],
    [820, 1180, 4],
  ])('%ix%i: x%i, at most 38%% of the viewport, Roy and the grass whole', (w, vh, k) => {
    const s = band(w, vh);
    expect(s.k).toBe(k);
    expect(s.sceneH).toBeLessThanOrEqual(Math.round(HERO_BAND_SHARE * vh));
    expect(s.sceneH % k).toBe(0);
    // Anchored to the bottom: the canopy crops, the ground (11 native rows) stays.
    expect(s.forestY + forest.h * k).toBe(s.sceneH);
    expect(s.groundH).toBe((forest.h - forest.groundRow) * k);
    // Roy's head is inside the band with air above it.
    const spriteTop = s.sceneH - s.groundH - wave.frameH * k;
    expect(spriteTop).toBeGreaterThanOrEqual(4 * k);
    expect(s.forestX).toBeLessThanOrEqual(0);
    expect(s.forestX + forest.w * k).toBeGreaterThanOrEqual(w);
  });

  it('crops the canopy on phones (360x740 keeps 93 of 112 rows)', () => {
    expect(band(360, 740).sceneH).toBe(93 * 3);
  });
});

describe('compact title screen geometry', () => {
  it.each([
    [844, 390],
    [640, 400],
    [800, 600],
    [667, 375],
    [740, 360],
    [932, 430],
  ])('%ix%i: Roy stands whole in the first screen, beside the card, no bird sliced', (w, vh) => {
    const viewH = heroHeight(vh) - HERO_NAV_H;
    const fit = compactOverlayFit(w, viewH);
    expect(fit).not.toBeNull();
    // The card grows the scene below the first screen; the forest is anchored to the first screen.
    const s = computeHeroScene('overlay', w, viewH + 300, { viewportH: vh, compact: true });
    const { k } = s;
    expect(k).toBe(fit!.k);
    expect(s.cardW).toBe(fit!.cardW);
    expect(s.cardW % 4).toBe(0);
    expect(s.cardW).toBeGreaterThanOrEqual(w >= 768 ? 432 : 368);
    const spriteTop = viewH + 300 - s.groundH - wave.frameH * k;
    expect(spriteTop).toBeGreaterThanOrEqual(0);
    expect(spriteTop + wave.frameH * k).toBeLessThanOrEqual(viewH);
    expect(s.forestY + forest.h * k).toBeGreaterThanOrEqual(viewH - forest.h);
    const cardEdge = containerContentLeft(w) + s.cardW + 12;
    expect(s.spriteX).toBeGreaterThanOrEqual(cardEdge + 32);
    expect(s.spriteX + wave.frameW * k).toBeLessThanOrEqual(w - 16);
    for (const [from, to] of FOREST_BIRD_COLUMNS) {
      const b0 = s.forestX + from * k;
      const b1 = s.forestX + to * k;
      const hidden = Math.min(Math.max(cardEdge - b0, 0), b1 - b0);
      expect(hidden === b1 - b0 || hidden <= k).toBe(true);
    }
    // The dirt fills the scene below the forest.
    expect(s.forestY + forest.h * k + s.groundExtraH).toBe(viewH + 300);
  });

  it('keeps the full 544px card on landscape phones and narrows it at 200% zoom', () => {
    expect(compactOverlayFit(844, 326)).toEqual({ k: 3, cardW: HERO_CARD_W });
    expect(compactOverlayFit(640, 336)?.k).toBe(3);
    expect(compactOverlayFit(640, 336)!.cardW).toBeLessThan(HERO_CARD_W);
  });
});
