import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZoneHeader } from './ZoneHeader';
import { resetZoneEntered } from '../../hooks/useZoneEntered';

describe('ZoneHeader', () => {
  it('renders the title as an H2 with the given id', () => {
    render(<ZoneHeader zone={1} name="The Library" title="Things I've Built" id="projects-title" />);
    const heading = screen.getByRole('heading', { level: 2, name: "Things I've Built" });
    expect(heading).toHaveAttribute('id', 'projects-title');
  });

  it('shows a zero-padded eyebrow with the zone name', () => {
    render(<ZoneHeader zone={1} name="The Library" title="Things I've Built" id="t" />);
    expect(screen.getByText('Zone 01 · The Library')).toHaveClass('text-label');
  });

  it('does not pad two-digit zones', () => {
    render(<ZoneHeader zone={12} name="Secret Room" title="Hidden" id="t" />);
    expect(screen.getByText('Zone 12 · Secret Room')).toBeInTheDocument();
  });

  it('labels its section through aria-labelledby', () => {
    render(
      <section aria-labelledby="about-title">
        <ZoneHeader zone={2} name="The Adventurer" title="About Me" id="about-title" />
      </section>,
    );
    expect(screen.getByRole('region', { name: 'About Me' })).toBeInTheDocument();
  });

  it('renders the optional subtitle and a decorative icon', () => {
    render(
      <ZoneHeader
        zone={3}
        name="Equipment"
        title="Skills"
        subtitle="What I fight with."
        icon={<svg data-testid="icon" />}
        id="t"
      />,
    );
    expect(screen.getByText('What I fight with.')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('omits the subtitle and icon slots when not given', () => {
    const { container } = render(<ZoneHeader zone={4} name="Resume Scroll" title="Resume" id="t" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('.zone-header__icon')).toBeNull();
    expect(container.querySelector('.px-divider')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ZoneHeader — structure', () => {
  it('keeps the heading structure: eyebrow, H2 (focusable by script only), subline, divider', () => {
    const { container } = render(
      <section aria-labelledby="skills-title">
        <ZoneHeader
          zone={3}
          name="Equipment"
          title="What I Work With"
          subtitle="Hover an item."
          icon={<svg />}
          id="skills-title"
        />
      </section>,
    );
    const header = container.querySelector('header.zone-header')!;
    const heading = screen.getByRole('heading', { level: 2, name: 'What I Work With' });
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(header).toContainElement(heading);
    expect(heading).toHaveAttribute('tabindex', '-1');
    const [eyebrow, subline] = Array.from(header.querySelectorAll('p'));
    expect(eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(subline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.lastElementChild).toContainElement(header.querySelector('.px-divider'));
    expect(screen.getByRole('region', { name: 'What I Work With' })).toBeInTheDocument();
  });

  it('only lets the eyebrow break after the dot: "ZONE 02 ·" / "THE ADVENTURER"', () => {
    const { container } = render(<ZoneHeader zone={2} name="The Adventurer" title="Who I Am" id="t" />);
    const text = container.querySelector('.zone-header__eyebrow')!.textContent!;
    expect(text).toBe('Zone\u00A002\u00A0· The\u00A0Adventurer');
    expect(text.match(/ /g)).toHaveLength(1);
  });
});

describe('ZoneHeader — zone entered banner', () => {
  type Callback = IntersectionObserverCallback;
  let callbacks: Callback[] = [];
  const originalIO = window.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  function mockMatchMedia(reduce: boolean) {
    window.matchMedia = (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList;
  }

  beforeEach(() => {
    callbacks = [];
    window.IntersectionObserver = class {
      constructor(callback: Callback) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    mockMatchMedia(false);
  });

  afterEach(() => {
    resetZoneEntered();
    window.IntersectionObserver = originalIO;
    window.matchMedia = originalMatchMedia;
  });

  /** Report the H2 below the 35% line, then (after a wheel) above it. */
  function crossLine() {
    const target = document.getElementById('about-title')!;
    // callbacks[0] is the zone observer (framer's in-view observers come later).
    const report = (isIntersecting: boolean) =>
      act(() =>
        callbacks[0](
          [{ target, isIntersecting, boundingClientRect: { bottom: 200 } } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
    report(false);
    act(() => void window.dispatchEvent(new Event('wheel')));
    report(true);
  }

  it('slides a decorative banner over the eyebrow once, then removes it', () => {
    const { container } = render(<ZoneHeader zone={2} name="The Adventurer" title="Who I Am" id="about-title" />);
    expect(screen.queryByTestId('zone-banner')).toBeNull();

    crossLine();
    const banner = screen.getByTestId('zone-banner');
    expect(banner).toHaveAttribute('aria-hidden', 'true');
    expect(banner).toHaveTextContent('Zone 02The Adventurer');
    expect(container.querySelector('.zone-header__eyebrow')).toContainElement(banner);
    expect(container.querySelector('.zone-header__eyebrow')).toHaveAttribute('data-banner');
    // The H2 still names the zone on its own.
    expect(screen.getByRole('heading', { level: 2, name: 'Who I Am' })).toBeInTheDocument();

    // jsdom has no AnimationEvent (React then listens for the webkit name): build both.
    const animationEnd = (animationName: string) => {
      for (const type of ['animationend', 'webkitAnimationEnd']) {
        const event = new Event(type, { bubbles: true });
        Object.defineProperty(event, 'animationName', { value: animationName });
        fireEvent(banner.firstElementChild!, event);
      }
    };
    animationEnd('zone-banner-in');
    expect(screen.getByTestId('zone-banner')).toBeInTheDocument();
    animationEnd('zone-banner-out');
    expect(screen.queryByTestId('zone-banner')).toBeNull();
    expect(container.querySelector('.zone-header__eyebrow')).not.toHaveAttribute('data-banner');
  });

  it('shows no banner and a static divider under reduced motion', () => {
    mockMatchMedia(true);
    const { container } = render(<ZoneHeader zone={2} name="The Adventurer" title="Who I Am" id="about-title" />);
    // Every observer on the page sees the heading cross the line: nothing may react.
    const target = document.getElementById('about-title')!;
    const report = (isIntersecting: boolean) =>
      callbacks.forEach(callback =>
        act(() =>
          callback(
            [{ target, isIntersecting, boundingClientRect: { bottom: 200 } } as unknown as IntersectionObserverEntry],
            {} as IntersectionObserver,
          ),
        ),
      );
    report(false);
    act(() => void window.dispatchEvent(new Event('wheel')));
    report(true);
    expect(screen.queryByTestId('zone-banner')).toBeNull();
    expect(container.querySelector('.zone-header__rule')).not.toHaveAttribute('data-draw');
  });

  it('keeps the divider pending until it is in view (then the CSS wipe runs)', () => {
    const { container } = render(<ZoneHeader zone={2} name="The Adventurer" title="Who I Am" id="about-title" />);
    expect(container.querySelector('.zone-header__rule')).toHaveAttribute('data-draw', 'pending');
  });
});
