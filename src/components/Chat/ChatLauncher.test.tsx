import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatLauncher, {
  BUBBLE_DELAY_MS,
  BUBBLE_INTRO_MS,
  BUBBLE_LINGER_MS,
  DOCK_LINE_MS,
  LAUNCHER_REACH_PX,
  measureDockSpot,
} from './ChatLauncher';
import { MAX_TYPE_MS } from '../../hooks/useTypewriter';
import { chatPersona } from '../../data/chatPersona';

const launcher = () => screen.getByRole('button', { name: chatPersona.launcherLabel });
const bubble = () => document.querySelector('.chat-bubble');
const [FIRST, SECOND, THIRD] = chatPersona.bubbles;

// jsdom has no matchMedia. Default: a desktop window (no query matches).
const mediaStub = (matches: (query: string) => boolean) =>
  ((query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;

beforeEach(() => {
  window.matchMedia = mediaStub(() => false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ChatLauncher', () => {
  it('renders nothing unless the chat is enabled (tests and previews run without it)', () => {
    const { container } = render(<ChatLauncher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the panel lazily and closes it back to the launcher', async () => {
    render(<ChatLauncher enabled />);
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('chat-panel')).toBeNull();

    await userEvent.click(launcher());
    expect(await screen.findByRole('dialog', { name: /pixel roy/i })).toBeInTheDocument();
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher()).toHaveFocus();
  });

  it('stands still, and waves while pointed at or focused', () => {
    render(<ChatLauncher enabled />);
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    fireEvent.pointerEnter(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
    fireEvent.pointerLeave(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    fireEvent.focus(launcher());
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
  });

  it('says hello in a bubble when the page loads, waving, then clears the corner', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    expect(bubble()).toBeNull();
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toHaveTextContent(FIRST);
    expect(bubble()).toHaveAttribute('aria-hidden', 'true');
    expect(launcher()).toHaveAttribute('data-pose', 'wave');
    act(() => vi.advanceTimersByTime(BUBBLE_INTRO_MS));
    expect(launcher()).toHaveAttribute('data-pose', 'idle');
    expect(bubble()).toBeNull();
  });

  it('shows the next line every time Roy is pointed at, and lets it linger before hiding', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS + BUBBLE_INTRO_MS));
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(SECOND);
    fireEvent.pointerLeave(launcher());
    expect(bubble()).toHaveTextContent(SECOND);
    act(() => vi.advanceTimersByTime(BUBBLE_LINGER_MS));
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(THIRD);
  });

  it('cycles back to the first line after the last one', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    for (let i = 1; i < chatPersona.bubbles.length; i++) {
      fireEvent.pointerEnter(launcher());
      fireEvent.pointerLeave(launcher());
    }
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toHaveTextContent(FIRST);
  });

  it('shows a line on keyboard focus too, and hides it while the chat is open', () => {
    vi.useFakeTimers();
    render(<ChatLauncher enabled />);
    fireEvent.focus(launcher());
    expect(bubble()).toHaveTextContent(FIRST);
    fireEvent.click(launcher());
    expect(bubble()).toBeNull();
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toBeNull();
  });

  it('keeps every line within the pixel-font rules (Latin-1, at most 24 characters)', () => {
    for (const line of chatPersona.bubbles) {
      expect(line.length).toBeLessThanOrEqual(24);
      expect(line).toMatch(/^[\x20-\x7e\xa0-\xff]+$/);
    }
  });

  it('does not pop the bubble when focus comes back from closing the panel', async () => {
    render(<ChatLauncher enabled />);
    await userEvent.click(launcher());
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: chatPersona.closeLabel }));
    expect(launcher()).toHaveFocus();
    expect(bubble()).toBeNull();
  });
});

/**
 * Phones: the fixed launcher used to sit on the hero's tagline and buttons on the first screen.
 * There it is docked on the hero art as a speech bubble that types the corner figure's own lines,
 * one after another; once the hero has scrolled clear of its corner it stands there as usual and
 * says hello.
 */
describe('ChatLauncher on a phone', () => {
  /** Leave requestAnimationFrame alone: the spy below runs the measure at once. */
  const TIMEOUTS_ONLY = { toFake: ['setTimeout', 'clearTimeout'] as ('setTimeout' | 'clearTimeout')[] };
  let heroBottom = 0;

  beforeEach(() => {
    window.matchMedia = mediaStub(query => query === '(max-width: 767px)');
    const hero = document.createElement('section');
    hero.id = 'hero';
    hero.getBoundingClientRect = () => ({ bottom: heroBottom }) as DOMRect;
    document.body.append(hero);
    // Frames run at once, a second apart: a scroll event is enough to move the launcher, and a
    // typed line is complete after two frames (it never takes longer than MAX_TYPE_MS).
    let now = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      now += MAX_TYPE_MS;
      cb(now);
      return 0;
    });
  });

  afterEach(() => {
    document.getElementById('hero')?.remove();
  });

  const root = () => document.querySelector<HTMLElement>('[data-chat-root]')!;
  const docked = () => root().hasAttribute('data-docked');
  const plate = () => launcher().querySelector('.chat-launcher__plate');
  const scrollHeroTo = (bottom: number) => {
    heroBottom = bottom;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
  };

  it('is there from the start, docked as a bubble with the first line, and pops no second bubble', () => {
    vi.useFakeTimers(TIMEOUTS_ONLY);
    heroBottom = window.innerHeight + 400;
    render(<ChatLauncher enabled />);
    expect(launcher()).toBeVisible();
    expect(docked()).toBe(true);
    // The same lines the corner figure says, typed: the part still to come keeps its place unseen.
    expect(plate()).toHaveTextContent(FIRST);
    expect(plate()!.querySelector('.chat-dock-line__rest')).not.toBeNull();
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toBeNull();
    // Pointing at it does not pop the corner bubble either: the docked bubble is the bubble.
    fireEvent.pointerEnter(launcher());
    expect(bubble()).toBeNull();
  });

  it('types the next line by itself, in the corner figure\'s order, and starts over at the end', () => {
    vi.useFakeTimers(TIMEOUTS_ONLY);
    heroBottom = window.innerHeight + 400;
    render(<ChatLauncher enabled />);
    const lines = chatPersona.bubbles;
    for (let i = 0; i <= lines.length; i++) {
      expect(plate()).toHaveTextContent(lines[i % lines.length]);
      // One ms short of the hold: still the same line.
      act(() => vi.advanceTimersByTime(DOCK_LINE_MS - 1));
      expect(plate()).toHaveTextContent(lines[i % lines.length]);
      act(() => vi.advanceTimersByTime(MAX_TYPE_MS + 1));
    }
  });

  it('opens the chat from the docked plate', async () => {
    // The panel schedules its own frames; the run-at-once spy would recurse on them.
    vi.mocked(window.requestAnimationFrame).mockRestore();
    heroBottom = window.innerHeight + 400;
    render(<ChatLauncher enabled />);
    await userEvent.click(launcher());
    expect(await screen.findByRole('dialog', { name: /pixel roy/i })).toBeInTheDocument();
    // An open chat is never docked: on a phone its sheet covers the page.
    expect(docked()).toBe(false);
  });

  it('stands in his corner once the hero has cleared it, and says hello once', () => {
    vi.useFakeTimers(TIMEOUTS_ONLY);
    heroBottom = window.innerHeight + 400;
    render(<ChatLauncher enabled />);

    scrollHeroTo(window.innerHeight - LAUNCHER_REACH_PX + 1);
    expect(docked()).toBe(true);
    scrollHeroTo(window.innerHeight - LAUNCHER_REACH_PX);
    expect(docked()).toBe(false);
    expect(plate()).toHaveTextContent(chatPersona.badge);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toHaveTextContent(FIRST);
    act(() => vi.advanceTimersByTime(BUBBLE_INTRO_MS));

    // Back up to the hero and down again: he docks and returns, without repeating the hello.
    scrollHeroTo(window.innerHeight + 400);
    expect(docked()).toBe(true);
    scrollHeroTo(0);
    expect(docked()).toBe(false);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toBeNull();
  });

  it('tries the hello again if the visitor scrolled back before he spoke', () => {
    vi.useFakeTimers(TIMEOUTS_ONLY);
    heroBottom = 0;
    render(<ChatLauncher enabled />);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS - 1));
    scrollHeroTo(window.innerHeight + 400);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toBeNull();
    scrollHeroTo(0);
    act(() => vi.advanceTimersByTime(BUBBLE_DELAY_MS));
    expect(bubble()).toHaveTextContent(FIRST);
  });

  it('is never docked on a page with no hero to protect', () => {
    document.getElementById('hero')?.remove();
    render(<ChatLauncher enabled />);
    expect(docked()).toBe(false);
  });

});

/**
 * The docked bubble stands left of the hero's Roy, its tail at his mouth. jsdom has no layout,
 * so the hero and his 55x92 wave frame are given rectangles (scale 3, as on a 390px phone).
 */
describe('measureDockSpot', () => {
  const K = 3;
  const mount = (layout: string, left: number, top = 100) => {
    const hero = document.createElement('section');
    hero.id = 'hero';
    hero.dataset.layout = layout;
    const roy = document.createElement('div');
    roy.setAttribute('data-hero-roy', '');
    roy.getBoundingClientRect = () => ({ left, top, width: 55 * K, height: 92 * K }) as DOMRect;
    hero.append(roy);
    document.body.append(hero);
  };

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 390 });
  });
  afterEach(() => {
    document.getElementById('hero')?.remove();
  });

  it('puts the bubble a tail away from his hair, level with his mouth', () => {
    mount('stack', 175);
    const hairLeft = 175 + 5 * K;
    expect(measureDockSpot()).toEqual({
      right: 390 - (hairLeft - 16),
      top: 100 + 20 * K - 14,
      // 190 - 16 (tail and air) - 8 (frame and edge)
      maxWidth: 166,
      compact: false,
    });
  });

  it('caps the bubble at 168px however much room there is', () => {
    mount('stack', 260);
    expect(measureDockSpot()).toMatchObject({ maxWidth: 168, compact: false });
  });

  it('narrows the bubble to the room there is, and tightens it on a very narrow phone', () => {
    // Hair at x = 150: 150 - 16 (tail and air) - 8 (frame and edge) = 126px of room.
    mount('stack', 150 - 5 * K);
    expect(measureDockSpot()).toMatchObject({ maxWidth: 126, compact: true });
  });

  it('gives up (the corner of the art takes over) when there is no room beside him', () => {
    mount('stack', 100);
    expect(measureDockSpot()).toBeNull();
  });

  it('gives up on an overlay hero: the title card stands left of him there', () => {
    mount('overlay', 500);
    expect(measureDockSpot()).toBeNull();
  });

  it('gives up before the hero has laid him out, and on a page with no hero', () => {
    expect(measureDockSpot()).toBeNull();
    const hero = document.createElement('section');
    hero.id = 'hero';
    hero.dataset.layout = 'stack';
    const roy = document.createElement('div');
    roy.setAttribute('data-hero-roy', '');
    hero.append(roy);
    document.body.append(hero);
    expect(measureDockSpot()).toBeNull();
  });
});
