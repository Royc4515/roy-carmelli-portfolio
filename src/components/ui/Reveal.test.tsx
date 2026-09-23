import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Reveal } from './Reveal';

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

const originalIntersectionObserver = window.IntersectionObserver;

/** An IntersectionObserver that reports every observed element as fully on screen. */
function mockAlwaysInView() {
  window.IntersectionObserver = class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      const entry = { target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry;
      queueMicrotask(() => this.callback([entry], this as unknown as IntersectionObserver));
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

describe('Reveal', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('materializes once in view, with the features LazyMotion loads (m.* components)', async () => {
    mockReducedMotion(false);
    mockAlwaysInView();
    render(
      <LazyMotion features={domAnimation}>
        <Reveal data-testid="card">Quest</Reveal>
      </LazyMotion>,
    );
    const el = screen.getByTestId('card');
    expect(el.style.opacity).toBe('0');
    await waitFor(() => expect(el.style.opacity).toBe('1'), { timeout: 2000 });
  });

  it('starts hidden (opacity 0) until it scrolls into view', () => {
    mockReducedMotion(false);
    render(<Reveal data-testid="card">Quest</Reveal>);
    const el = screen.getByTestId('card');
    expect(el.tagName).toBe('DIV');
    expect(el.style.opacity).toBe('0');
  });

  it('renders fully visible with no initial state under reduced motion', () => {
    mockReducedMotion(true);
    render(
      <ul>
        <Reveal as="li" index={2} data-testid="card" className="card">
          Quest
        </Reveal>
      </ul>,
    );
    const el = screen.getByTestId('card');
    expect(el.tagName).toBe('LI');
    expect(el).toHaveClass('card');
    expect(el).toHaveTextContent('Quest');
    expect(el.style.opacity).toBe('');
    expect(el.style.transform).toBe('');
    expect(el).not.toHaveAttribute('style');
  });

  it('supports article and section elements', () => {
    mockReducedMotion(false);
    render(
      <>
        <Reveal as="article" data-testid="a">
          A
        </Reveal>
        <Reveal as="section" data-testid="s">
          S
        </Reveal>
      </>,
    );
    expect(screen.getByTestId('a').tagName).toBe('ARTICLE');
    expect(screen.getByTestId('s').tagName).toBe('SECTION');
  });
});
