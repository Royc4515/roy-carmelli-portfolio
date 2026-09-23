import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import GameLoadFailed from './GameLoadFailed';

describe('GameLoadFailed', () => {
  it('announces what went wrong in plain language', () => {
    render(<GameLoadFailed onQuit={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load the game. Check your connection and try again.",
    );
  });

  it('reloads the page to try again, and quits', async () => {
    const onReload = vi.fn();
    const onQuit = vi.fn();
    render(<GameLoadFailed onQuit={onQuit} onReload={onReload} />);
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(onReload).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(onQuit).toHaveBeenCalledOnce();
  });

  it('draws with the design system: wood panel, pixel buttons and icons, 48px targets', () => {
    const { container } = render(<GameLoadFailed onQuit={() => {}} />);
    expect(container.firstElementChild).toHaveClass('px-panel', 'px-panel--wood', 'px-frame');
    const reload = screen.getByRole('button', { name: /reload/i });
    const quit = screen.getByRole('button', { name: /quit/i });
    expect(reload).toHaveClass('px-btn', 'px-btn--primary');
    expect(quit).toHaveClass('px-btn', 'px-btn--secondary');
    expect(reload.querySelector('[data-icon="play"]')).not.toBeNull();
    expect(quit.querySelector('[data-icon="close"]')).not.toBeNull();
  });
});
