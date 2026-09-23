import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Skills from './Skills';
import { skills } from '../data/bio';
import { projects } from '../data/projects';
import { placeTooltip } from '../components/SkillTooltip';

const originalMatchMedia = window.matchMedia;

/** The `short` variant's query (src/index.css), which Skills.css repeats as a plain @media. */
const SHORT_QUERY = '(width >= 64rem) and (height <= 60rem)';

/**
 * `mobile` answers the < 768px query (and the opposite for ≥ 1024px); `short` answers the
 * short-laptop query; reduced motion is on so Reveal renders plain elements.
 */
function mockMedia({ mobile, short = false }: { mobile: boolean; short?: boolean }) {
  const answers: Record<string, boolean> = {
    '(prefers-reduced-motion: reduce)': true,
    '(max-width: 767px)': mobile,
    '(min-width: 1024px)': !mobile,
    [SHORT_QUERY]: short,
  };
  window.matchMedia = (query: string) =>
    ({
      matches: answers[query] ?? false,
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

  it('renders the Character once, at x3 from 1024px', () => {
    render(<Skills />);
    const sprites = document.querySelectorAll('#skills [data-pose]');
    expect(sprites).toHaveLength(1);
    expect(sprites[0]).toHaveAttribute('aria-hidden', 'true');
    expect((sprites[0] as HTMLElement).style.width).toBe(`${28 * 3}px`);
  });

  it('gives every slot heading its pixel icon', () => {
    render(<Skills />);
    const icons = screen.getAllByRole('heading', { level: 3 }).map(h => h.querySelector('svg')?.dataset.icon);
    expect(icons).toEqual(['sword', 'person', 'star', 'potion', 'book', 'gear', 'trophy']);
  });

  it('certifications say "Certificate earned" instead of an empty "Used in"', () => {
    render(<Skills />);
    act(() => item('Claude 101').focus());
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Certificate earned');
    expect(tip).not.toHaveTextContent(/Used in/i);
  });
});

describe('Skills keyboard grid (roving tabindex)', () => {
  beforeEach(() => mockMedia({ mobile: false }));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const allItems = () => screen.getAllByRole('button').filter(b => b.closest('[role="grid"]'));
  const tabStops = () => allItems().filter(b => b.tabIndex === 0);
  const tip = () => screen.getByRole('tooltip');

  /** The section between two outside buttons, so Tab has somewhere to go on both sides. */
  function renderBetween() {
    render(
      <>
        <button type="button">Before</button>
        <Skills />
        <button type="button">After</button>
      </>,
    );
  }

  it('is one labelled grid: a row per slot (its heading as row header), a cell per item', () => {
    render(<Skills />);
    const grid = screen.getByRole('grid', { name: 'Equipment' });
    const rows = within(grid).getAllByRole('row');
    expect(rows).toHaveLength(skills.length);
    rows.forEach((row, i) => {
      const header = within(row).getByRole('rowheader');
      expect(within(header).getByRole('heading', { level: 3 })).toHaveAccessibleName(
        `${skills[i].slot}: ${skills[i].category}`,
      );
      const cells = within(row).getAllByRole('gridcell');
      expect(cells.map(c => within(c).getByRole('button').textContent)).toEqual(skills[i].items);
    });
  });

  it('the whole grid is a single Tab stop (was one per item)', () => {
    render(<Skills />);
    const total = skills.reduce((n, g) => n + g.items.length, 0);
    expect(allItems()).toHaveLength(total);
    expect(tabStops()).toEqual([item('Java 17')]);
    expect(allItems().filter(b => b.tabIndex === -1)).toHaveLength(total - 1);
  });

  it('Tab enters the grid once and leaves on the next Tab; Shift+Tab returns to the last item', async () => {
    const user = userEvent.setup();
    renderBetween();
    act(() => screen.getByRole('button', { name: 'Before' }).focus());

    await user.tab();
    expect(item('Java 17')).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(item('C')).toHaveFocus();
    expect(tabStops()).toEqual([item('C')]);

    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab({ shift: true });
    expect(item('C')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
  });

  it('arrows, Home and End move focus, and the tooltip follows it', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.tab();

    await user.keyboard('{ArrowRight}');
    expect(item('Python')).toHaveFocus();
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(tip()).toHaveTextContent('Sommelier Bot');
    expect(item('Python')).toHaveAttribute('aria-describedby', tip().id);

    await user.keyboard('{ArrowDown}'); // Armor, same column
    expect(item('Vite')).toHaveFocus();
    expect(tip()).toHaveTextContent('Web & Full Stack');
    await user.keyboard('{ArrowUp}');
    expect(item('Python')).toHaveFocus();

    await user.keyboard('{End}');
    expect(item('x86 Assembly')).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // end of the slot: stays
    expect(item('x86 Assembly')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('Java 17')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowUp}'); // first item of the first slot: stays
    expect(item('Java 17')).toHaveFocus();

    await user.keyboard('{Control>}{End}{/Control}');
    expect(item('Claude 101')).toHaveFocus();
    expect(tip()).toHaveTextContent('Certificate earned');
    await user.keyboard('{ArrowDown}'); // last slot: stays
    expect(item('Claude 101')).toHaveFocus();
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(item('Java 17')).toHaveFocus();
    expect(tip()).toHaveTextContent('Arkanoid Game');
  });

  it('Up / Down keep a sticky column through shorter slots', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    act(() => item('Telegram Bot API').focus()); // Magic, column 8 of 8
    expect(tabStops()).toEqual([item('Telegram Bot API')]);

    await user.keyboard('{ArrowDown}'); // Potions has 5 items
    expect(item('Jupyter')).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Tomes has 5
    expect(item('Systems Programming')).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Trinkets has 8: back to column 8
    expect(item('GitHub Pages')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowUp}'); // a sideways move resets the column
    expect(item('Systems Programming')).toHaveFocus();
  });

  it('Esc closes the tooltip and keeps focus; the next arrow opens the next item', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.tab();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(item('Java 17')).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(item('Python')).toHaveFocus();
    expect(tip()).toHaveTextContent('Python');
  });

  it('handled keys never scroll the page; Tab, Enter and Alt+arrows pass through', () => {
    render(<Skills />);
    const java = item('Java 17');
    act(() => java.focus());
    // fireEvent returns false when the default was prevented.
    expect(fireEvent.keyDown(java, { key: 'ArrowUp' })).toBe(false); // an edge, still handled
    expect(fireEvent.keyDown(java, { key: 'ArrowDown' })).toBe(false);
    expect(item('React')).toHaveFocus();
    expect(fireEvent.keyDown(item('React'), { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(item('React'), { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(item('React'), { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(item('React')).toHaveFocus();
  });

  it('a click moves the Tab stop to the clicked item', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.click(item('Pandas'));
    expect(tabStops()).toEqual([item('Pandas')]);
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

/*
 * Short laptop screens (≥ 1024 wide, ≤ 960 tall, e.g. 1097x516 at 175% Windows scaling): a
 * compact inventory, one line of items per slot under a status line. The layout is CSS only
 * (`short:` classes + Skills.css), which jsdom does not apply, so these tests pin what the
 * layout relies on: one DOM for every screen, the order it stacks, the subgrid hooks, the key
 * moves across the stacked slots, and the stylesheet's sizes.
 */
describe('Skills on short laptop screens (the `short` variant)', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const withStableIds = (html: string) => html.replace(/:r[0-9a-z]+:/g, ':id:');

  it('is CSS only: the same DOM whether or not the short query matches', () => {
    mockMedia({ mobile: false, short: false });
    const tall = render(<Skills />);
    const tallHtml = withStableIds(tall.container.innerHTML);
    tall.unmount();

    mockMedia({ mobile: false, short: true });
    const short = render(<Skills />);
    expect(withStableIds(short.container.innerHTML)).toBe(tallHtml);
  });

  it('stacks top to bottom in reading order: the status line, then every slot in data order', () => {
    mockMedia({ mobile: false, short: true });
    render(<Skills />);
    const status = document.querySelector<HTMLElement>('#skills .skill-status')!;
    const grid = screen.getByRole('grid', { name: 'Equipment' });
    expect(status.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The level, the stats and the keycap hint all ride the status line.
    expect(within(status).getByText(/Roy · LVL 3/)).toBeInTheDocument();
    expect(status.querySelector('dl')?.textContent).toContain(`Projects${projects.length}`);
    expect(within(status).getByTestId('skill-keys')).toBeInTheDocument();
    // The column wrappers dissolve, so the rows stack in data order.
    expect(within(grid).getAllByRole('row').map(r => within(r).getByRole('heading').textContent)).toEqual(
      skills.map(g => `${g.slot} ·: ${g.category}`),
    );
  });

  it('has the hooks the one-line-per-slot layout needs (subgrids, dissolving columns, no well)', () => {
    mockMedia({ mobile: false, short: true });
    render(<Skills />);
    const grid = screen.getByRole('grid', { name: 'Equipment' });
    const layout = grid.parentElement!;
    expect(layout).toHaveClass('short:grid-cols-[max-content_minmax(0,1fr)]');
    expect(grid).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    for (const column of grid.children) expect(column).toHaveClass('short:contents', 'short:space-y-0');
    for (const row of within(grid).getAllByRole('row')) {
      expect(row).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    }
    const status = layout.querySelector('.skill-status')!;
    expect(status).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    expect(status.querySelector('.skill-well')).toHaveClass('short:hidden');
  });

  it('Up / Down cross the column split: the next slot is the line right below', async () => {
    mockMedia({ mobile: false, short: true });
    const user = userEvent.setup();
    render(<Skills />);
    act(() => item('Claude API').focus()); // Magic, the last slot of the first column
    await user.keyboard('{ArrowDown}');
    expect(item('NumPy')).toHaveFocus(); // Potions, the first slot of the second column
    await user.keyboard('{ArrowUp}');
    expect(item('Claude API')).toHaveFocus();
    // Magic wraps onto a second line there: Right runs on through the wrap, in reading order.
    act(() => item('Prompt Engineering').focus());
    await user.keyboard('{ArrowRight}');
    expect(item('Serverless Functions')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Google OAuth')).toHaveFocus(); // Armor, same column (clamped to its last item)
  });
});

describe('Skills.css short-mode sizes', () => {
  const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), 'utf8');
  // Read from disk: the Vitest config stubs CSS imports (css: false).
  const skillsCss = read('./Skills.css');
  const indexCss = read('../index.css');
  const values = (name: string) =>
    [...skillsCss.matchAll(new RegExp(`--${name}:\\s*(\\d+)px;`, 'g'))].map(m => Number(m[1]));

  it('repeats the `short` variant query exactly', () => {
    expect(indexCss).toContain(`@custom-variant short (@media ${SHORT_QUERY});`);
    expect(skillsCss).toContain(`@media ${SHORT_QUERY} {`);
  });

  it('keeps every item at least 24px tall (WCAG 2.2 2.5.8) and every gap on the 4px grid', () => {
    expect(values('skill-h')).toEqual([28, 24]);
    const spacing = ['gap-x', 'row-gap', 'col-gap', 'status-gap', 'panel-pt', 'panel-pb'];
    for (const name of spacing.map(s => `skill-${s}`)) {
      const found = values(name);
      expect(found.length).toBeGreaterThan(0);
      for (const px of found) expect(px % 4).toBe(0);
    }
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
