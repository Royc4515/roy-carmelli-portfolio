import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Navbar, { mapProgress, nodeState, pathState, walkKeyframes } from './Navbar';
import { ToastProvider } from './ui/Toast';
import { bio } from '../data/bio';

// Default: desktop viewport (isMobile = false)
function setupMatchMedia(isMobile: boolean) {
  window.matchMedia = (query: string) => {
    const match = query.match(/max-width:\s*(\d+)px/);
    const breakpoint = match ? parseInt(match[1], 10) : 0;
    return {
      matches: isMobile && 375 <= breakpoint,
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

const defaultProps = {
  theme: 'night' as const,
  onToggleTheme: vi.fn(),
};

describe('Navbar — desktop', () => {
  beforeEach(() => { setupMatchMedia(false); vi.restoreAllMocks(); });

  it('renders all desktop nav links', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('link', { name: /back to top/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });

  it('does not render the hamburger button on desktop', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /toggle menu/i })).not.toBeInTheDocument();
  });

  it('calls onToggleTheme when theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(<Navbar {...defaultProps} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByRole('button', { name: /switch to day/i }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it('sits in a banner landmark with a "Main" navigation', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('banner')).toContainElement(screen.getByRole('navigation', { name: 'Main' }));
  });

  it('links the brand to the top and every section link to its zone', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('link', { name: 'Roy Carmelli, back to top' })).toHaveAttribute('href', '#hero');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('href', '#skills');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact');
  });

  it('offers the resume as a download', () => {
    render(<Navbar {...defaultProps} />);
    const resume = screen.getByRole('link', { name: 'Resume' });
    expect(resume).toHaveAttribute('href', bio.resume.href);
    expect(resume).toHaveAttribute('download', bio.resume.fileName);
  });

  it('labels the theme toggle for the mode it switches to', () => {
    const { rerender } = render(<Navbar {...defaultProps} theme="day" />);
    expect(screen.getByRole('button', { name: 'Switch to night mode' })).toBeInTheDocument();
    rerender(<Navbar {...defaultProps} theme="night" />);
    expect(screen.getByRole('button', { name: 'Switch to day mode' })).toBeInTheDocument();
  });

  it('gains its hard drop once the page has scrolled past 8px', () => {
    const { container } = render(<Navbar {...defaultProps} />);
    const bar = container.querySelector('.site-nav__bar')!;
    expect(bar).not.toHaveClass('px-drop-sm');
    try {
      act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 9 });
        window.dispatchEvent(new Event('scroll'));
      });
      expect(bar).toHaveClass('px-drop-sm');
      act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 8 });
        window.dispatchEvent(new Event('scroll'));
      });
      expect(bar).not.toHaveClass('px-drop-sm');
    } finally {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    }
  });

  describe('Play', () => {
    /** A hero `top` px below the viewport top (0 = already in place). */
    function mountHero(top: number) {
      const hero = document.createElement('section');
      hero.id = 'hero';
      hero.scrollIntoView = vi.fn();
      hero.getBoundingClientRect = () => ({ top }) as DOMRect;
      document.body.append(hero);
      return hero;
    }

    it('scrolls to the hero and starts the game only once the scroll has settled', () => {
      vi.useFakeTimers();
      const hero = mountHero(-3000);
      const onPlay = vi.fn();
      window.addEventListener('arcade:play', onPlay);
      try {
        render(<Navbar {...defaultProps} />);
        act(() => screen.getByRole('button', { name: /play/i }).click());
        expect(hero.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        // A long scroll: well past the old fixed 400ms, still no game.
        act(() => { vi.advanceTimersByTime(800); });
        expect(onPlay).not.toHaveBeenCalled();
        act(() => { window.dispatchEvent(new Event('scrollend')); });
        expect(onPlay).toHaveBeenCalledOnce();
        // The fallback timer was cleared: no second start.
        act(() => { vi.advanceTimersByTime(2000); });
        expect(onPlay).toHaveBeenCalledOnce();
      } finally {
        window.removeEventListener('arcade:play', onPlay);
        hero.remove();
        vi.useRealTimers();
      }
    });

    it('falls back to a timeout where scrollend never fires', () => {
      vi.useFakeTimers();
      const hero = mountHero(-3000);
      const onPlay = vi.fn();
      window.addEventListener('arcade:play', onPlay);
      try {
        render(<Navbar {...defaultProps} />);
        act(() => screen.getByRole('button', { name: /play/i }).click());
        act(() => { vi.advanceTimersByTime(1200); });
        expect(onPlay).toHaveBeenCalledOnce();
      } finally {
        window.removeEventListener('arcade:play', onPlay);
        hero.remove();
        vi.useRealTimers();
      }
    });

    it('starts at once when the hero is already in place', () => {
      const hero = mountHero(0);
      const onPlay = vi.fn();
      window.addEventListener('arcade:play', onPlay);
      try {
        render(<Navbar {...defaultProps} />);
        act(() => screen.getByRole('button', { name: /play/i }).click());
        expect(onPlay).toHaveBeenCalledOnce();
      } finally {
        window.removeEventListener('arcade:play', onPlay);
        hero.remove();
      }
    });
  });
});

describe('Navbar — active section', () => {
  type Callback = IntersectionObserverCallback;
  class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];
    constructor(readonly callback: Callback) { MockIntersectionObserver.instances.push(this); }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }

  const ids = ['projects', 'about', 'skills', 'resume', 'contact'];
  const tops: Record<string, number> = {};
  const originalIO = window.IntersectionObserver;

  // jsdom's innerHeight is 768: the spy line sits at 30% (230.4px).
  function scrollSectionsTo(positions: Record<string, number>) {
    Object.assign(tops, positions);
    act(() => {
      MockIntersectionObserver.instances.at(-1)!.callback([], {} as IntersectionObserver);
    });
  }

  beforeEach(() => {
    setupMatchMedia(false);
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    ids.forEach((id, i) => {
      tops[id] = 800 + i * 800;
      const el = document.createElement('section');
      el.id = id;
      el.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect;
      document.body.append(el);
    });
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
    ids.forEach(id => document.getElementById(id)?.remove());
  });

  const link = (name: string) => screen.getByRole('link', { name });

  it('marks no link on the hero', () => {
    render(<Navbar {...defaultProps} />);
    ['Projects', 'About', 'Skills', 'Contact'].forEach(name =>
      expect(link(name)).not.toHaveAttribute('aria-current'),
    );
  });

  it('gives the link of the section under the spy line aria-current="true"', () => {
    render(<Navbar {...defaultProps} />);
    scrollSectionsTo({ projects: 100, about: 900, skills: 1700, resume: 2500, contact: 3300 });
    expect(link('Projects')).toHaveAttribute('aria-current', 'true');
    expect(link('About')).not.toHaveAttribute('aria-current');

    scrollSectionsTo({ projects: -1500, about: -700, skills: 200, resume: 1000, contact: 1800 });
    expect(link('Skills')).toHaveAttribute('aria-current', 'true');
    expect(link('Projects')).not.toHaveAttribute('aria-current');
  });

  it('lights nothing on the resume band (it has no link), then Contact', () => {
    render(<Navbar {...defaultProps} />);
    scrollSectionsTo({ projects: -2400, about: -1600, skills: -800, resume: 100, contact: 900 });
    ['Projects', 'About', 'Skills', 'Contact'].forEach(name =>
      expect(link(name)).not.toHaveAttribute('aria-current'),
    );
    scrollSectionsTo({ projects: -3200, about: -2400, skills: -1600, resume: -800, contact: 50 });
    expect(link('Contact')).toHaveAttribute('aria-current', 'true');
  });

  it('draws the mini-map path as decoration only: aria-hidden, links keep their names', () => {
    const { container } = render(<Navbar {...defaultProps} />);
    const decorations = container.querySelectorAll('.mm-node, .mm-path, .mm-walker');
    // 4 nodes, 3 path segments, 1 walker.
    expect(decorations).toHaveLength(8);
    decorations.forEach(el => expect(el).toHaveAttribute('aria-hidden', 'true'));
    ['Projects', 'About', 'Skills', 'Contact'].forEach(name => expect(link(name)).toBeInTheDocument());
  });

  it('marks nodes and path segments visited up to the current zone', () => {
    const { container } = render(<Navbar {...defaultProps} />);
    const states = (selector: string) =>
      Array.from(container.querySelectorAll(selector)).map(el => el.getAttribute('data-state'));

    expect(states('.mm-node')).toEqual(['ahead', 'ahead', 'ahead', 'ahead']);
    scrollSectionsTo({ projects: -1500, about: -700, skills: 200, resume: 1000, contact: 1800 });
    expect(states('.mm-node')).toEqual(['visited', 'visited', 'current', 'ahead']);
    expect(states('.mm-path')).toEqual(['visited', 'visited', 'ahead']);

    // Resume band: no node is current; the path into Contact is walked halfway.
    scrollSectionsTo({ projects: -2400, about: -1600, skills: -800, resume: 100, contact: 900 });
    expect(states('.mm-node')).toEqual(['visited', 'visited', 'visited', 'ahead']);
    expect(states('.mm-path')).toEqual(['visited', 'visited', 'half']);
  });

  it('shows a mobile zone chip that reflects the zone and opens the pause menu', async () => {
    setupMatchMedia(true);
    render(<Navbar {...defaultProps} />);
    expect(document.querySelector('.zone-chip')).toBeNull();

    scrollSectionsTo({ projects: -2400, about: -1600, skills: -800, resume: 100, contact: 900 });
    const chip = screen.getByRole('button', { name: 'Zone 4 of 5: Resume. Open the menu' });
    expect(chip).toHaveTextContent('Zone 4/5Resume');
    expect(chip).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(chip);
    expect(screen.getByTestId('mobile-menu-overlay')).toHaveAttribute('aria-hidden', 'false');
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(chip).toHaveFocus();
    document.body.style.overflow = '';
  });

  it('moves focus to the zone heading after a pause-menu jump', async () => {
    setupMatchMedia(true);
    const heading = document.createElement('h2');
    heading.id = 'about-title';
    heading.tabIndex = -1;
    const about = document.getElementById('about')!;
    about.setAttribute('aria-labelledby', 'about-title');
    about.append(heading);

    render(<Navbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    await userEvent.click(screen.getByTestId('mobile-menu-overlay').querySelector('a[href="#about"]')!);
    await waitFor(() => expect(heading).toHaveFocus());
    document.body.style.overflow = '';
  });
});

describe('Navbar — mobile', () => {
  beforeEach(() => { setupMatchMedia(true); vi.restoreAllMocks(); });
  afterEach(() => { document.body.style.overflow = ''; });

  it('renders the hamburger button on mobile', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });

  it('does not render desktop nav links on mobile', () => {
    render(<Navbar {...defaultProps} />);
    // Desktop link list should be absent
    expect(screen.queryByRole('navigation')?.querySelector('.rpg-nav-links')).toBeFalsy();
  });

  it('mobile overlay is hidden by default (menuOpen = false)', () => {
    render(<Navbar {...defaultProps} />);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('toggles overlay open when hamburger is clicked', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(hamburger);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'false');
  });

  it('closes the overlay when a nav link is clicked', async () => {
    render(<Navbar {...defaultProps} />);
    // Open the menu
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    // Click a nav link inside the overlay
    const overlayLink = screen.getByTestId('mobile-menu-overlay')
      .querySelector('a[href="#projects"]');
    expect(overlayLink).not.toBeNull();
    await userEvent.click(overlayLink!);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('hamburger reports its state and swaps the menu icon for a close icon', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveAttribute('aria-controls', screen.getByTestId('mobile-menu-overlay').id);
    expect(hamburger.querySelector('[data-icon="menu"]')).not.toBeNull();
    await userEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(hamburger.querySelector('[data-icon="close"]')).not.toBeNull();
    expect(hamburger.querySelector('[data-icon="menu"]')).toBeNull();
  });

  it('keeps the closed overlay inert, and drops inert when open', async () => {
    render(<Navbar {...defaultProps} />);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(overlay).not.toHaveAttribute('inert');
  });

  it('focuses the first item on open and locks the page scroll', async () => {
    render(<Navbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay.querySelector('a[href="#projects"]')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('Esc closes the menu, returns focus to the Menu button and unlocks the scroll', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(hamburger);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('mobile-menu-overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('"Continue" closes the menu and returns focus to the Menu button', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(hamburger);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByTestId('mobile-menu-overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(hamburger).toHaveFocus();
  });

  it('keeps Tab inside the header while the menu is open', async () => {
    render(<Navbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const resumeGame = screen.getByRole('button', { name: /continue/i });
    resumeGame.focus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: /back to top/i })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(resumeGame).toHaveFocus();
  });

  it('shows a resume download icon button and the menu items', async () => {
    render(<Navbar {...defaultProps} />);
    const download = screen.getByRole('link', { name: 'Download resume' });
    expect(download).toHaveAttribute('href', bio.resume.href);
    expect(download).toHaveAttribute('download', bio.resume.fileName);

    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const overlay = screen.getByTestId('mobile-menu-overlay');
    ['#projects', '#about', '#skills', '#contact'].forEach(href =>
      expect(overlay.querySelector(`a[href="${href}"]`)).not.toBeNull(),
    );
    expect(overlay.querySelector(`a[href="${bio.resume.href}"]`)).toHaveAttribute('download', bio.resume.fileName);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to day/i })).toBeInTheDocument();
  });
});

describe('Navbar — resume loot toast', () => {
  const blockNavigation = (event: Event) => event.preventDefault();
  beforeEach(() => document.addEventListener('click', blockNavigation));
  afterEach(() => {
    document.removeEventListener('click', blockNavigation);
    document.body.style.overflow = '';
  });

  const lootText = `Loot acquired: ${bio.resume.fileName}`;

  it('pops the loot toast from the desktop Resume button', async () => {
    setupMatchMedia(false);
    render(
      <ToastProvider>
        <Navbar {...defaultProps} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Resume' }));
    expect(await screen.findByText(lootText)).toBeInTheDocument();
  });

  it('pops it from the mobile download button and the pause-menu row', async () => {
    setupMatchMedia(true);
    render(
      <ToastProvider>
        <Navbar {...defaultProps} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Download resume' }));
    expect(await screen.findByText(lootText)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const row = screen.getByTestId('mobile-menu-overlay').querySelector(`a[href="${bio.resume.href}"]`)!;
    await userEvent.click(row);
    expect(await screen.findByText(lootText)).toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-overlay')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Navbar — mini-map helpers', () => {
  it('maps the active zone to a position on the path', () => {
    expect(mapProgress(null)).toBe(-1);
    expect(mapProgress('projects')).toBe(0);
    expect(mapProgress('skills')).toBe(2);
    expect(mapProgress('resume')).toBe(2.5);
    expect(mapProgress('contact')).toBe(3);
  });

  it('derives node and path states from the position', () => {
    expect([0, 1, 2, 3].map(i => nodeState(i, 1))).toEqual(['visited', 'current', 'ahead', 'ahead']);
    expect([1, 2, 3].map(i => pathState(i, 1))).toEqual(['visited', 'ahead', 'ahead']);
    expect([1, 2, 3].map(i => pathState(i, 2.5))).toEqual(['visited', 'visited', 'half']);
    expect([0, 1, 2, 3].map(i => nodeState(i, -1))).toEqual(['ahead', 'ahead', 'ahead', 'ahead']);
  });

  it('walks in four whole-pixel, held steps, hopping on odd steps', () => {
    const frames = walkKeyframes(10, 107);
    expect(frames.map(f => f.offset)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(frames.map(f => f.transform)).toEqual([
      'translate(10px, 0px)',
      'translate(34px, -2px)',
      'translate(59px, 0px)',
      'translate(83px, -2px)',
      'translate(107px, 0px)',
    ]);
    frames.slice(0, 4).forEach(f => expect(f.easing).toBe('step-end'));
  });
});
