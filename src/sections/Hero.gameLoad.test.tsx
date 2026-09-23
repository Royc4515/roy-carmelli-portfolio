import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Hero from './Hero';

// The lazily loaded game chunk fails to arrive (offline, or a tab left open across a redeploy
// that removed the old hashed chunk): its import rejects the way the browser's does.
vi.mock('../components/MiniGame/MiniGame', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function setupMatchMedia(coarse: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('pointer: coarse') ? coarse : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

const MESSAGE = "Couldn't load the game. Check your connection and try again.";

function renderPage() {
  return render(
    <>
      <main>
        <Hero />
        <section id="projects">Quests</section>
      </main>
      <footer>Footer</footer>
    </>,
  );
}

describe('Hero — the game fails to load', () => {
  beforeEach(() => setupMatchMedia(false));

  it('keeps the page and shows a message with Reload and Quit instead of going blank', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE);
    // The rest of the hero is still mounted (the root did not unmount).
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Roy Runner' }).querySelector('[data-game-load-failed]');
    expect(panel).not.toBeNull();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('quits like a normal quit: scroll unlocked, page no longer inert, focus back on Press start', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await screen.findByRole('alert');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.getElementById('projects')).toHaveAttribute('inert');
    // The panel's own Quit (the desktop row's Quit is hidden by CSS while the panel shows).
    const panel = document.querySelector<HTMLElement>('[data-game-load-failed]')!;
    const quit = [...panel.querySelectorAll('button')].find(b => /quit/i.test(b.textContent ?? ''))!;
    await userEvent.click(quit);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Roy Runner' })).toBeNull());
    expect(document.body.style.overflow).toBe('');
    expect(document.getElementById('projects')).not.toHaveAttribute('inert');
    expect(document.querySelector('footer')).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: /press start/i })).toHaveFocus();
  });

  it('marks the desktop area so its controls row can step aside for the panel', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await screen.findByRole('alert');
    const game = screen.getByRole('region', { name: 'Roy Runner' });
    expect(game).toHaveClass('hero-game');
    expect(game.querySelector('.hero-game__controls')).toHaveTextContent('Esc');
  });

  it('offers Quit in touch play too, where the game has no other way out', async () => {
    setupMatchMedia(true);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /press start/i }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: /quit/i }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Roy Runner' })).toBeNull());
    expect(document.body.style.overflow).toBe('');
  });
});
