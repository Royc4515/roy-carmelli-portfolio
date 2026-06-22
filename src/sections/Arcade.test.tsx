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
 * Anything else (e.g. legacy max-width) reports the `coarse` flag as a stand-in for
 * "is mobile", which is unused by Arcade but keeps the mock harmless.
 */
function setupMatchMedia({ coarse, portrait }: { coarse: boolean; portrait: boolean }) {
  window.matchMedia = (query: string) => {
    let matches = false;
    if (query.includes('pointer: coarse')) matches = coarse;
    else if (query.includes('orientation: portrait')) matches = portrait;
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
