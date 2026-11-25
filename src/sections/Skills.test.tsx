import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Skills from './Skills';
import { skills } from '../data/bio';
import { projects } from '../data/projects';
import { pixelSprites } from '../theme/pixelSprites';

const originalMatchMedia = window.matchMedia;

/** The `short` variant's query (src/index.css), which Skills.css repeats as a plain @media. */
const SHORT_QUERY = '(width >= 64rem) and (height <= 60rem)';
/** Tall screens from xl: the rest of the xl range, where Skills.css sizes the slot lines. */
const XL_TALL_QUERY = '(width >= 80rem) and (height > 60rem)';

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
      expect(slotHeadings[i]).toHaveAccessibleName(g.category);
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

    const js = item('JavaScript');
    act(() => js.focus());

    const tip = screen.getByRole('tooltip');
    expect(js).toHaveAttribute('aria-describedby', tip.id);
    expect(within(tip).getByText('JavaScript')).toBeInTheDocument();
    expect(within(tip).getByText('Languages')).toBeInTheDocument();
    expect(tip).toHaveTextContent(/Used in/i);
    const used = within(tip).getAllByRole('listitem').map(li => li.textContent);
    expect(used).toEqual(['Nechita Raka,', 'Aside,', 'Leet-For-Berger,', 'Groupie,', 'White Matter Tracts Game']);
    expect(js).toHaveAccessibleDescription(/Used in: Nechita Raka, Aside, Leet-For-Berger, Groupie, White Matter Tracts Game/);

    // Keyboard focus leaving the grid takes its description with it.
    act(() => js.blur());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('normalizes versions: React lists the React 19 project', () => {
    render(<Skills />);
    act(() => item('React').focus());
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Wolt Clone');
    expect(tip).toHaveTextContent('Personal Portfolio');
  });

  it('never invents usage', () => {
    render(<Skills />);

    act(() => item('Data Structures').focus());
    let tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Studied in coursework');
    expect(tip).not.toHaveTextContent(/Used in/i);

    act(() => item('Claude Code').focus());
    tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('AI & Agents');
    expect(tip).not.toHaveTextContent(/Used in/i);
    expect(tip).not.toHaveTextContent(/coursework/i);

    act(() => item('C').focus());
    tip = screen.getByRole('tooltip');
    expect(tip).not.toHaveTextContent(/Used in/i);
  });

  it('opens on hover and stays after the pointer leaves, so it can travel to the strip', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.hover(item('Python'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Wine Sommelier Bot');
    await user.unhover(item('Python'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Wine Sommelier Bot');
    expect(item('Python')).toHaveAttribute('data-open');

    // Another item replaces it; only one description shows at a time.
    await user.hover(item('Vite'));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Vite');
    expect(item('Vite')).toHaveAttribute('data-open');
    expect(item('Python')).not.toHaveAttribute('data-open');
  });

  it('closes on Esc and on a press outside the items', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.hover(item('Vite'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(item('Vite'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('a press on the strip itself keeps it open', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.hover(item('Python'));
    fireEvent.pointerDown(screen.getByRole('tooltip'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('places the description against the panel, not against its item', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    await user.hover(item('Python'));
    const tip = screen.getByRole('tooltip');
    // No positioned ancestor between the strip and the panel, or it would hang off the item again.
    const panel = tip.closest('.skill-panel')!;
    expect(panel).toHaveClass('relative', 'md:pb-26');
    for (let el = tip.parentElement; el && el !== panel; el = el.parentElement) {
      expect(el.className).not.toMatch(/(^|\s)(relative|absolute|sticky|fixed)(\s|$)/);
    }
  });

  it('keyboard: Tab opens, Enter toggles, Esc closes', async () => {
    const user = userEvent.setup();
    render(<Skills />);

    await user.tab();
    expect(item('Java 17')).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Arkanoid');

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
    expect((sprites[0] as HTMLElement).style.width).toBe(`${pixelSprites.idle.frameW * 3}px`);
  });

  it('gives every slot heading its pixel icon', () => {
    render(<Skills />);
    const icons = screen.getAllByRole('heading', { level: 3 }).map(h => h.querySelector('svg')?.dataset.icon);
    expect(icons).toEqual(['sword', 'person', 'star', 'potion', 'book', 'gear', 'trophy']);
  });

  it('items with a floating tooltip claim no expanded state', () => {
    render(<Skills />);
    act(() => item('JavaScript').focus());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    for (const name of ['JavaScript', 'Python']) expect(item(name)).not.toHaveAttribute('aria-expanded');
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
      expect(within(header).getByRole('heading', { level: 3 })).toHaveAccessibleName(skills[i].category);
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
    expect(tip()).toHaveTextContent('Wine Sommelier Bot');
    expect(item('Python')).toHaveAttribute('aria-describedby', tip().id);

    await user.keyboard('{ArrowDown}'); // Armor, same column
    expect(item('Node.js')).toHaveFocus();
    expect(tip()).toHaveTextContent('Web & Full-Stack');
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
    expect(item('AI Fluency')).toHaveFocus();
    expect(tip()).toHaveTextContent('Certificate earned');
    await user.keyboard('{ArrowDown}'); // last slot: stays
    expect(item('AI Fluency')).toHaveFocus();
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(item('Java 17')).toHaveFocus();
    expect(tip()).toHaveTextContent('Arkanoid');
  });

  it('Up / Down keep a sticky column through shorter slots', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    act(() => item('Telegram Bot API').focus()); // Magic, column 7 of 7
    expect(tabStops()).toEqual([item('Telegram Bot API')]);

    await user.keyboard('{ArrowDown}'); // Potions has 5 items
    expect(item('Jupyter')).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Tomes has 4
    expect(item('Systems Programming')).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Trinkets has 6: toward column 7 again, clamped to 6
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
    // Ctrl/Cmd + arrow stays with the browser (Cmd+Left/Right is Back/Forward on macOS).
    expect(fireEvent.keyDown(item('React'), { key: 'ArrowRight', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(item('React'), { key: 'ArrowLeft', ctrlKey: true })).toBe(true);
    expect(item('React')).toHaveFocus();
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
    expect(row).toHaveTextContent('Wine Sommelier Bot');
    expect(row).toHaveTextContent('CLR');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    // The hidden tooltip still describes the item for assistive tech.
    expect(item('Vercel')).toHaveAccessibleDescription(/Used in: Nechita Raka, Wine Sommelier Bot, Fit Check, Groupie, Personal Portfolio, CLR/);

    await user.click(item('Vercel'));
    expect(screen.queryByTestId('skill-detail')).not.toBeInTheDocument();
  });

  it('the item says whether its inline row is open (aria-expanded)', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    expect(item('Vercel')).toHaveAttribute('aria-expanded', 'false');
    await user.click(item('Vercel'));
    expect(item('Vercel')).toHaveAttribute('aria-expanded', 'true');
    expect(item('React')).toHaveAttribute('aria-expanded', 'false');
    await user.click(item('Vercel'));
    expect(item('Vercel')).toHaveAttribute('aria-expanded', 'false');
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
    expect(within(status).getByText(/Roy · 3rd year/)).toBeInTheDocument();
    expect(status.querySelector('dl')?.textContent).toContain(`Projects${projects.length}`);
    expect(within(status).getByTestId('skill-keys')).toBeInTheDocument();
    // The slots are the grid's own rows, in data order.
    expect(within(grid).getAllByRole('row').map(r => within(r).getByRole('heading').textContent)).toEqual(
      skills.map(g => g.category),
    );
  });

  it('has the hooks the one-line-per-slot layout needs (subgrids, slots as direct rows, no well)', () => {
    mockMedia({ mobile: false, short: true });
    render(<Skills />);
    const grid = screen.getByRole('grid', { name: 'Equipment' });
    const layout = grid.parentElement!;
    expect(layout).toHaveClass('short:grid-cols-[max-content_minmax(0,1fr)]');
    expect(grid).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    // No column wrappers: every child of the grid is a slot row.
    expect([...grid.children].map(c => c.getAttribute('role'))).toEqual(skills.map(() => 'row'));
    for (const row of within(grid).getAllByRole('row')) {
      expect(row).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    }
    const status = layout.querySelector('.skill-status')!;
    expect(status).toHaveClass('short:col-span-2', 'short:grid-cols-subgrid');
    expect(status.querySelector('.skill-well')).toHaveClass('short:hidden');
  });

  it('Up / Down go to the slot on the line right above or below', async () => {
    mockMedia({ mobile: false, short: true });
    const user = userEvent.setup();
    render(<Skills />);
    act(() => item('Claude API').focus()); // Magic
    await user.keyboard('{ArrowDown}');
    expect(item('NumPy')).toHaveFocus(); // Potions, the next line down
    await user.keyboard('{ArrowUp}');
    expect(item('Claude API')).toHaveFocus();
    // Magic wraps onto a second line on the narrower short screens: Right runs on through the wrap.
    act(() => item('Claude Code').focus());
    await user.keyboard('{ArrowRight}');
    expect(item('Telegram Bot API')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Tailwind CSS')).toHaveFocus(); // Armor, same column
  });
});

/*
 * Tall screens from xl (1280px wide, taller than the short laptop screens): Roy's frame keeps
 * the left column and every slot is one line of items beside its heading, the headings in a
 * column shared through subgrids (CSS only, like the short layout).
 */
describe('Skills on tall screens from xl', () => {
  beforeEach(() => mockMedia({ mobile: false }));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('lays the slots out one per line with a shared heading column, beside the frame', () => {
    render(<Skills />);
    const grid = screen.getByRole('grid', { name: 'Equipment' });
    const layout = grid.parentElement!;
    expect(layout).toHaveClass('lg:grid-cols-[220px_minmax(0,1fr)]', 'xl:grid-cols-[152px_minmax(0,1fr)]');
    expect(grid).toHaveClass('xl:grid-cols-[max-content_minmax(0,1fr)]');
    expect(grid).not.toHaveClass('xl:grid-cols-2');
    for (const row of within(grid).getAllByRole('row')) {
      expect(row).toHaveClass('xl:col-span-2', 'xl:grid', 'xl:grid-cols-subgrid');
    }
    // The frame stays: only the short layout hides the well.
    const well = layout.querySelector('.skill-well')!;
    expect(well.className).not.toMatch(/(^|\s)xl:hidden/);
    expect(well).toHaveClass('short:hidden');
  });

  it('names each slot by its category alone, with no RPG slot word or level', () => {
    render(<Skills />);
    const heading = screen.getAllByRole('heading', { level: 3 })[0];
    expect(heading).toHaveAccessibleName(skills[0].category);
    expect(heading).not.toHaveTextContent(skills[0].slot);
    expect(document.querySelector('#skills')).not.toHaveTextContent(/LVL/);
  });

  it('draws certificates as plain text, not as technology slots', () => {
    render(<Skills />);
    for (const group of skills) {
      const plain = group.category === 'Certifications';
      for (const name of group.items) {
        expect(item(name).classList.contains('skill-item--plain')).toBe(plain);
      }
    }
  });

  it('Up / Down go to the slot above or below, in data order', async () => {
    const user = userEvent.setup();
    render(<Skills />);
    act(() => item('Claude API').focus()); // Magic
    await user.keyboard('{ArrowDown}');
    expect(item('NumPy')).toHaveFocus(); // Potions
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(item('React')).toHaveFocus(); // Armor
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

  it('lays the inspector strip along the panel bottom, and over the status line on short screens', () => {
    const strip = skillsCss.slice(skillsCss.indexOf('  .skill-tip {'), skillsCss.indexOf('  .skill-detail {'));
    expect(strip).toMatch(/position: absolute;[\s\S]*bottom: 28px;/);
    // The short block is the only place it moves to the top.
    const short = strip.slice(strip.indexOf(`@media ${SHORT_QUERY} {`));
    expect(short).toContain('top: calc(var(--skill-panel-pt) - 4px);');
    expect(short).toContain('bottom: auto;');
  });

  it('sizes the tall xl slot lines in their own block, which never meets the short one', () => {
    expect(skillsCss).toContain(`@media ${XL_TALL_QUERY} {`);
  });

  it('keeps every item at least 24px tall (WCAG 2.2 2.5.8) and every gap on the 4px grid', () => {
    // Tall xl · short · short under 600px.
    expect(values('skill-h')).toEqual([36, 28, 24]);
    const spacing = ['gap-x', 'row-gap', 'col-gap', 'slot-gap', 'status-gap', 'panel-pt', 'panel-pb'];
    for (const name of spacing.map(s => `skill-${s}`)) {
      const found = values(name);
      expect(found.length).toBeGreaterThan(0);
      for (const px of found) expect(px % 4).toBe(0);
    }
  });
});
