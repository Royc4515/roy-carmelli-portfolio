import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LazyMotion, domAnimation } from 'framer-motion';
import Hero from './Hero';
import ArcadeFallback from '../components/ArcadeFallback';

/**
 * main.tsx loads Framer Motion's DOM features once, in a `strict` LazyMotion (strict throws if a
 * full-size `motion.*` component slips in). A nested `<LazyMotion>` inside a section duplicates
 * that and turns `strict` off for its subtree, so the hero and the rotate prompt must not render
 * one: count every LazyMotion rendered besides the root this test provides.
 */
const lazyMotion = vi.hoisted(() => ({ renders: 0 }));
vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  const Counted: typeof actual.LazyMotion = props => {
    lazyMotion.renders += 1;
    return actual.LazyMotion(props);
  };
  return { ...actual, LazyMotion: Counted };
});

function setupMatchMedia(opts: { mobileWidth: boolean; coarse: boolean; portrait: boolean }) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('max-width')
        ? opts.mobileWidth
        : query.includes('pointer: coarse')
          ? opts.coarse
          : query.includes('orientation: portrait')
            ? opts.portrait
            : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

/** The app's root provider, as in main.tsx. */
function renderUnderRoot(ui: ReactElement) {
  const result = render(
    <LazyMotion features={domAnimation} strict>
      {ui}
    </LazyMotion>,
  );
  lazyMotion.renders = 0;
  return result;
}

describe('Hero and ArcadeFallback use the root LazyMotion', () => {
  beforeEach(() => {
    lazyMotion.renders = 0;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('the hero and its game render no LazyMotion of their own', async () => {
    setupMatchMedia({ mobileWidth: false, coarse: false, portrait: false });
    renderUnderRoot(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await waitFor(() => expect(document.querySelector('canvas')).not.toBeNull());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('canvas')).toBeNull());
    expect(lazyMotion.renders).toBe(0);
  });

  it('the rotate prompt renders no LazyMotion of its own', async () => {
    setupMatchMedia({ mobileWidth: true, coarse: true, portrait: true });
    renderUnderRoot(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await screen.findByTestId('arcade-fallback-message');
    expect(lazyMotion.renders).toBe(0);
    renderUnderRoot(<ArcadeFallback />);
    expect(lazyMotion.renders).toBe(0);
  });
});
