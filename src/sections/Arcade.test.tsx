import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Arcade from './Arcade';

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/**
 * Mocks matchMedia for the game display-mode queries:
 *  - `(pointer: coarse)`       → `coarse`
 *  - `(orientation: portrait)` → `portrait`
 *  - `(max-width: 767px)`      → `narrow` (phone-sized; defaults to `coarse`)
 */
function setupMatchMedia(
  { coarse, portrait, narrow = coarse }: { coarse: boolean; portrait: boolean; narrow?: boolean },
) {
  window.matchMedia = (query: string) => {
    let matches = false;
    if (query.includes('pointer: coarse')) matches = coarse;
    else if (query.includes('orientation: portrait')) matches = portrait;
    else if (query.includes('max-width')) matches = narrow;
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

describe('Arcade section — desktop (fine pointer)', () => {
  beforeEach(() => { setupMatchMedia({ coarse: false, portrait: false }); vi.restoreAllMocks(); });

  it('mounts a canvas element (MiniGame) on desktop', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('does not render the rotate prompt on desktop', () => {
    render(<Arcade />);
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });

  it('does not show the SLIDE touch button on desktop', () => {
    render(<Arcade />);
    expect(screen.queryByRole('button', { name: /slide/i })).toBeNull();
  });

  it('renders the "Roy Runner" heading', () => {
    render(<Arcade />);
    expect(screen.getByText(/roy runner/i)).toBeInTheDocument();
  });
});

describe('Arcade section — phone portrait', () => {
  beforeEach(() => { setupMatchMedia({ coarse: true, portrait: true }); vi.restoreAllMocks(); });

  it('does NOT mount a canvas element in portrait', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders the rotate prompt in portrait', () => {
    render(<Arcade />);
    expect(screen.getByTestId('arcade-fallback-message')).toBeInTheDocument();
  });

  it('still renders the "Roy Runner" heading in portrait', () => {
    render(<Arcade />);
    expect(screen.getByRole('heading', { name: /roy runner/i })).toBeInTheDocument();
  });
});

describe('Arcade section — phone landscape', () => {
  beforeEach(() => { setupMatchMedia({ coarse: true, portrait: false }); vi.restoreAllMocks(); });

  it('mounts a canvas element (the game) in landscape', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('shows the SLIDE touch button in landscape', () => {
    render(<Arcade />);
    expect(screen.getByRole('button', { name: /slide/i })).toBeInTheDocument();
  });

  it('does not render the rotate prompt in landscape', () => {
    render(<Arcade />);
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });
});

describe('Arcade section — tablet portrait (wide enough to play)', () => {
  // coarse + portrait but NOT narrow: a portrait tablet should play, not see the prompt.
  beforeEach(() => {
    setupMatchMedia({ coarse: true, portrait: true, narrow: false });
    vi.restoreAllMocks();
  });

  it('mounts the game (canvas) and does not show the rotate prompt', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).not.toBeNull();
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });
});
