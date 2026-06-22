import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Hero from './Hero';

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

describe('Hero — desktop', () => {
  beforeEach(() => {
    setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
    vi.restoreAllMocks();
  });

  it('renders the PRESS START button', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
  });

  it('mounts MiniGame when PRESS START is clicked', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('does NOT render the rotate prompt on desktop', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });

  it('does NOT show the SLIDE touch button on desktop', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.queryByRole('button', { name: /^slide/i })).toBeNull();
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
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders the rotate prompt instead of the game in portrait', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.getByTestId('arcade-fallback-message')).toBeInTheDocument();
  });

  it('renders the waving character sprite on mobile (no player card)', () => {
    render(<Hero />);
    expect(screen.getByAltText(/roy waving hello/i)).toBeInTheDocument();
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
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('shows the SLIDE touch button in landscape', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.getByRole('button', { name: /^slide/i })).toBeInTheDocument();
  });

  it('does NOT render the rotate prompt in landscape', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });
});
