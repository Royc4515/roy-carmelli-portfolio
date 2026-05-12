import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Hero from './Hero';

// framer-motion uses ResizeObserver — stub it
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

describe('Hero — desktop', () => {
  beforeEach(() => { setupMatchMedia(false); vi.restoreAllMocks(); });

  it('renders the PRESS START button', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
  });

  it('mounts MiniGame when PRESS START is clicked', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    // MiniGame renders a <canvas>
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('does NOT render ArcadeFallback on desktop', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });
});

describe('Hero — mobile', () => {
  beforeEach(() => {
    setupMatchMedia(true);
    vi.restoreAllMocks();
    // Stub scrollIntoView (not in jsdom)
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the PRESS START button on mobile', () => {
    render(<Hero />);
    expect(screen.getByRole('button', { name: /press start/i })).toBeInTheDocument();
  });

  it('does NOT mount a canvas when PRESS START is clicked on mobile', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders ArcadeFallback instead of MiniGame on mobile', async () => {
    render(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(screen.getByTestId('arcade-fallback-message')).toBeInTheDocument();
  });

  it('does NOT render the character panel on mobile (avoids offset overflow)', () => {
    render(<Hero />);
    expect(screen.queryByAltText(/pixel avatar/i)).toBeNull();
  });
});
