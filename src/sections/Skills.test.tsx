import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Skills from './Skills';
import { skills } from '../data/bio';
import { projects } from '../data/projects';
import { placeTooltip } from '../components/SkillTooltip';

const originalMatchMedia = window.matchMedia;

/** `mobile` answers the < 768px query; reduced motion is on so Reveal renders plain elements. */
function mockMedia({ mobile }: { mobile: boolean }) {
  window.matchMedia = (query: string) =>
    ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? true : query === '(max-width: 767px)' ? mobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

const item = (name: string) => screen.getByRole('button', { name });

describe('Skills (equipment screen)', () => {
  beforeEach(() => mockMedia({ mobile: false }));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('is a labelled section with the zone header', () => {
    render(<Skills />);
    const heading = screen.getByRole('heading', { level: 2, name: 'What I Work With' });
    const section = document.getElementById('skills')!;
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByText(/Zone 03 · Equipment/i)).toBeInTheDocument();
  });

  it('renders one slot per skill group, in data order, with every item as a button', () => {
    render(<Skills />);
    const slotHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(slotHeadings).toHaveLength(skills.length);
    skills.forEach((g, i) => {
      expect(slotHeadings[i]).toHaveAccessibleName(`${g.slot}: ${g.category}`);
    });
    for (const group of skills) {
      for (const name of group.items) {
        expect(item(name)).toHaveAttribute('aria-describedby');
      }
    }
  });

  it('shows stats counted from the data', () => {
    render(<Skills />);
    const text = document.querySelector('#skills dl')?.textContent ?? '';
    expect(text).toContain(`Projects${projects.length}`);
    expect(text).toContain(`Languages${skills.find(g => g.category === 'Languages')!.items.length}`);
    expect(text).toContain(`Certifications${skills.find(g => g.category === 'Certifications')!.items.length}`);
  });

  it('opens the tooltip on focus with the right "Used in" text', () => {
    render(<Skills />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const ts = item('TypeScript');
    act(() => ts.focus());

    const tip = screen.getByRole('tooltip');
    expect(ts).toHaveAttribute('aria-describedby', tip.id);
    expect(within(tip).getByText('TypeScript')).toBeInTheDocument();
    expect(within(tip).getByText('Languages')).toBeInTheDocument();
    expect(tip).toHaveTextContent(/Used in/i);
    const used = within(tip).getAllByRole('listitem').map(li => li.textContent);
    expect(used).toEqual(['Culinary Logic Repository,', 'This Portfolio']);
    expect(ts).toHaveAccessibleDescription(/Used in: Culinary Logic Repository, This Portfolio/);

    act(() => ts.blur());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('normalizes versions: React lists the React 19 project', () => {
    render(<Skills />);
    act(() => item('React').focus());
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('CareerPredict AI');
    expect(tip).toHaveTextContent('This Portfolio');
  });

  it('never invents usage', () => {
    render(<Skills />);

    act(() => item('Algorithms').focus());
    let tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Studied in coursework');
    expect(tip).not.toHaveTextContent(/Used in/i);

    act(() => item('MCP').focus());
    tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('AI & Agents');
    expect(tip).not.toHaveTextContent(/Used in/i);
    expect(tip).not.toHaveTextContent(/coursework/i);

    act(() => item('C').focus());
    tip = screen.getByRole('tooltip');
    expect(tip).not.toHaveTextContent(/Used in/i);
  });

  it('opens on hover, closes on leave and on Esc', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.hover(item('Python'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sommelier Bot');
    await user.unhover(item('Python'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(item('Vite'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keyboard: Tab opens, Enter toggles, Esc closes', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.tab();
    expect(item('Java 17')).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Arkanoid Game');

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(item('Java 17')).toHaveFocus();
  });
});

describe('Skills on mobile (< 768px)', () => {
  beforeEach(() => mockMedia({ mobile: true }));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('a tap toggles an inline detail row instead of a floating tooltip', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.click(item('Vercel'));
    const row = screen.getByTestId('skill-detail');
    expect(row).toHaveTextContent('Sommelier Bot');
    expect(row).toHaveTextContent('Culinary Logic Repository');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    // The hidden tooltip still describes the item for assistive tech.
    expect(item('Vercel')).toHaveAccessibleDescription(/Used in: Sommelier Bot, Culinary Logic Repository/);

    await user.click(item('Vercel'));
    expect(screen.queryByTestId('skill-detail')).not.toBeInTheDocument();
  });

  it('tapping elsewhere closes the row', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.click(item('NumPy'));
    expect(screen.getByTestId('skill-detail')).toBeInTheDocument();
    await user.click(screen.getByRole('heading', { level: 2 }));
    expect(screen.queryByTestId('skill-detail')).not.toBeInTheDocument();
  });
});

describe('placeTooltip', () => {
  const viewport = { width: 1000, height: 800 };
  const size = { width: 200, height: 100 };
  const anchor = (left: number, top: number, width = 80) => ({
    left,
    right: left + width,
    top,
    bottom: top + 36,
  });

  it('hangs below, left-aligned with the item, by default', () => {
    expect(placeTooltip(anchor(100, 200), size, viewport)).toEqual({ x: 0, side: 'bottom' });
  });

  it('flips left (right edges aligned) near the right edge', () => {
    // 900 + 200 > 1000 - 16: align the right edges, 980 - 200 = 780.
    expect(placeTooltip(anchor(900, 200), size, viewport)).toEqual({ x: -120, side: 'bottom' });
  });

  it('clamps to the margin when neither alignment fits', () => {
    const narrow = { width: 240, height: 800 };
    // right-aligned would start at -40; clamped to 16.
    expect(placeTooltip(anchor(120, 200, 40), size, narrow).x).toBe(16 - 120);
  });

  it('flips up near the bottom, but only if it fits above', () => {
    expect(placeTooltip(anchor(100, 700), size, viewport).side).toBe('top');
    expect(placeTooltip(anchor(100, 120), size, { width: 1000, height: 260 }).side).toBe('bottom');
  });
});
