import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Navbar from './Navbar';
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

  it('Play scrolls to the hero, then dispatches arcade:play after 400ms', async () => {
    vi.useFakeTimers();
    try {
      const hero = document.createElement('section');
      hero.id = 'hero';
      hero.scrollIntoView = vi.fn();
      document.body.append(hero);
      const onPlay = vi.fn();
      window.addEventListener('arcade:play', onPlay);

      render(<Navbar {...defaultProps} />);
      act(() => screen.getByRole('button', { name: /play/i }).click());
      expect(hero.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      expect(onPlay).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(400); });
      expect(onPlay).toHaveBeenCalledOnce();

      window.removeEventListener('arcade:play', onPlay);
      hero.remove();
    } finally {
      vi.useRealTimers();
    }
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

  it('"Resume game" closes the menu and returns focus to the Menu button', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(hamburger);
    await userEvent.click(screen.getByRole('button', { name: /resume game/i }));
    expect(screen.getByTestId('mobile-menu-overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(hamburger).toHaveFocus();
  });

  it('keeps Tab inside the header while the menu is open', async () => {
    render(<Navbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    const resumeGame = screen.getByRole('button', { name: /resume game/i });
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
