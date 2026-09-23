import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
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

describe('Reveal', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
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
