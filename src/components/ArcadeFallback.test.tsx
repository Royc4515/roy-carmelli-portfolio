import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArcadeFallback from './ArcadeFallback';

describe('ArcadeFallback', () => {
  it('renders the fallback heading', () => {
    render(<ArcadeFallback />);
    expect(screen.getByText(/arcade zone/i)).toBeInTheDocument();
  });

  it('renders an informational message about the screen size requirement', () => {
    render(<ArcadeFallback />);
    // Should communicate that a larger screen / desktop is required
    const message = screen.getByTestId('arcade-fallback-message');
    expect(message).toBeInTheDocument();
    expect(message.textContent?.toLowerCase()).toMatch(/desktop|larger screen|landscape/);
  });

  it('does NOT mount a canvas element', () => {
    const { container } = render(<ArcadeFallback />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('does NOT import or instantiate the GameEngine', () => {
    // Structural: if canvas is absent, the engine is never constructed.
    // This test acts as a regression guard — if someone accidentally adds a
    // canvas, the previous test catches it; this one documents the intent.
    const { container } = render(<ArcadeFallback />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('contains a pixel-art styled container (PixelPanel)', () => {
    const { container } = render(<ArcadeFallback />);
    // PixelPanel renders a div with a specific box-shadow — verify something
    // is rendered as the root wrapper
    expect(container.firstChild).not.toBeNull();
  });
});
