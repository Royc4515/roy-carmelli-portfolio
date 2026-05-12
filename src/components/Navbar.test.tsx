import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navbar from './Navbar';

// Default: desktop viewport (isMobile = false)
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

const defaultProps = {
  theme: 'night' as const,
  onToggleTheme: vi.fn(),
};

describe('Navbar — desktop', () => {
  beforeEach(() => { setupMatchMedia(false); vi.restoreAllMocks(); });

  it('renders all desktop nav links', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });

  it('does not render the hamburger button on desktop', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /toggle menu/i })).not.toBeInTheDocument();
  });

  it('calls onToggleTheme when theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(<Navbar {...defaultProps} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByRole('button', { name: /switch to day/i }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});

describe('Navbar — mobile', () => {
  beforeEach(() => { setupMatchMedia(true); vi.restoreAllMocks(); });

  it('renders the hamburger button on mobile', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });

  it('does not render desktop nav links on mobile', () => {
    render(<Navbar {...defaultProps} />);
    // Desktop link list should be absent
    expect(screen.queryByRole('navigation')?.querySelector('.rpg-nav-links')).toBeFalsy();
  });

  it('mobile overlay is hidden by default (menuOpen = false)', () => {
    render(<Navbar {...defaultProps} />);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('toggles overlay open when hamburger is clicked', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    await userEvent.click(hamburger);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'false');
  });

  it('closes the overlay when a nav link is clicked', async () => {
    render(<Navbar {...defaultProps} />);
    // Open the menu
    await userEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
    // Click a nav link inside the overlay
    const overlayLink = screen.getByTestId('mobile-menu-overlay')
      .querySelector('a[href="#hero"]');
    expect(overlayLink).not.toBeNull();
    await userEvent.click(overlayLink!);
    const overlay = screen.getByTestId('mobile-menu-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('hamburger shows ✕ icon when menu is open', async () => {
    render(<Navbar {...defaultProps} />);
    const hamburger = screen.getByRole('button', { name: /toggle menu/i });
    expect(hamburger).toHaveTextContent('☰');
    await userEvent.click(hamburger);
    expect(hamburger).toHaveTextContent('✕');
  });
});
