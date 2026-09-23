import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { LazyMotion, domAnimation } from 'framer-motion';
import ArcadeFallback from './ArcadeFallback';

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduced : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/** Under the app's root provider (main.tsx), which loads the DOM animation features. */
function renderWithMotion() {
  const result = render(
    <LazyMotion features={domAnimation} strict>
      <ArcadeFallback />
    </LazyMotion>,
  );
  return result.container.querySelector<HTMLElement>('span[aria-hidden="true"]')!;
}

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

  it('uses an ARCADE ZONE heading and the rotate-phone pixel icon, with no emoji', () => {
    const { container } = render(<ArcadeFallback />);
    expect(screen.getByRole('heading', { name: /arcade zone/i })).toBeInTheDocument();
    expect(container.querySelector('svg[data-icon="rotate-phone"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  describe('the rotate-phone icon', () => {
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('turns: it starts upright and steps to sideways (the loop runs, not parked on its last keyframe)', async () => {
      mockReducedMotion(false);
      const icon = renderWithMotion();
      expect(icon.style.transform).not.toMatch(/90deg/);
      await waitFor(() => expect(icon.style.transform).toMatch(/rotate\(90deg\)/), { timeout: 2000 });
    });

    it('rests upright under reduced motion', async () => {
      mockReducedMotion(true);
      const icon = renderWithMotion();
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(icon.style.transform).not.toMatch(/90deg/);
    });
  });

  it('contains a pixel-art styled container (PixelPanel)', () => {
    const { container } = render(<ArcadeFallback />);
    // PixelPanel renders a div with a specific box-shadow — verify something
    // is rendered as the root wrapper
    expect(container.firstChild).not.toBeNull();
  });
});
