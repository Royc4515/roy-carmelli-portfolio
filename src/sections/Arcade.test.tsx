import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Arcade from './Arcade';

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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

describe('Arcade section — desktop', () => {
  beforeEach(() => { setupMatchMedia(false); vi.restoreAllMocks(); });

  it('mounts a canvas element (MiniGame) on desktop', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('does not render ArcadeFallback on desktop', () => {
    render(<Arcade />);
    expect(screen.queryByTestId('arcade-fallback-message')).toBeNull();
  });

  it('renders the "Roy Runner" heading', () => {
    render(<Arcade />);
    expect(screen.getByText(/roy runner/i)).toBeInTheDocument();
  });
});

describe('Arcade section — mobile', () => {
  beforeEach(() => { setupMatchMedia(true); vi.restoreAllMocks(); });

  it('does NOT mount a canvas element on mobile', () => {
    render(<Arcade />);
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('renders ArcadeFallback on mobile', () => {
    render(<Arcade />);
    expect(screen.getByTestId('arcade-fallback-message')).toBeInTheDocument();
  });

  it('still renders the "Roy Runner" heading on mobile', () => {
    render(<Arcade />);
    expect(screen.getByRole('heading', { name: /roy runner/i })).toBeInTheDocument();
  });
});
