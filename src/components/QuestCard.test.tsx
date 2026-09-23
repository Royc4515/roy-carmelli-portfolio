import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import QuestCard, { QUEST_SCREENSHOTS, ResearchLogItem, metaLine, splitTitle } from './QuestCard';
import { itemForProject } from './ItemSprite';
import { projects } from '../data/projects';
import type { Project } from '../types/index';

const byId = (id: string): Project => {
  const p = projects.find(project => project.id === id);
  if (!p) throw new Error(`no project ${id}`);
  return p;
};

/** True when every element comes after the one before it in document order. */
const inDocumentOrder = (elements: Element[]) =>
  elements.every(
    (el, i) => i === 0 || Boolean(elements[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
  );

describe('splitTitle', () => {
  it('splits on the first " - "', () => {
    expect(splitTitle('Aside - AI Sidebar')).toEqual({ name: 'Aside', subtitle: 'AI Sidebar' });
    expect(splitTitle('Signal Processing - Synthetic Signals')).toEqual({
      name: 'Signal Processing',
      subtitle: 'Synthetic Signals',
    });
  });

  it('leaves other titles whole', () => {
    expect(splitTitle('CareerPredict AI')).toEqual({ name: 'CareerPredict AI' });
    expect(splitTitle('Multi-step')).toEqual({ name: 'Multi-step' });
    expect(splitTitle(' - leading')).toEqual({ name: ' - leading' });
    expect(splitTitle('Trailing - ')).toEqual({ name: 'Trailing - ' });
  });
});

describe('metaLine', () => {
  it('joins kind and year with non-breaking spaces around the dot', () => {
    expect(metaLine({ kind: 'Java game', year: 2025 })).toBe('Java game\u00a0·\u00a02025');
  });

  it('holds a " + " kind together and lets it break before the dot instead', () => {
    expect(metaLine({ kind: 'Website + engine', year: 2026 })).toBe('Website\u00a0+\u00a0engine ·\u00a02026');
  });
});

describe('every project has a visual', () => {
  it.each(projects.map(p => [p.id, p] as const))('%s has a screenshot or an item', (_id, project) => {
    expect(Boolean(QUEST_SCREENSHOTS[project.id] || itemForProject(project.id))).toBe(true);
  });
});

describe('<QuestCard> main quest (feature)', () => {
  const aside = byId('ai-sidebar');

  it('names the card by its full title and shows the tier and meta', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const heading = screen.getByRole('heading', { level: 4, name: 'Aside - AI Sidebar' });
    const card = screen.getByRole('article', { name: 'Aside - AI Sidebar' });
    expect(card).toContainElement(heading);
    expect(within(card).getByText('Main quest')).toBeInTheDocument();
    expect(within(card).getByText(/Chrome extension · 2026/)).toBeInTheDocument();
    expect(within(card).getByText(aside.tagline)).toBeInTheDocument();
  });

  it('sets the subtitle on the type scale (body, body-l from md), semibold throughout', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const subtitle = screen.getByText('AI Sidebar');
    expect(subtitle).toHaveClass('text-body', 'md:text-body-l', 'font-semibold', 'md:font-semibold');
    expect(subtitle.className).not.toMatch(/text-\[/);
  });

  it('shows the real screenshot, responsive, lazy and not pixelated', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const img = screen.getByRole('img', { name: /Every AI model\. One sidebar\./ });
    expect(img).toHaveAttribute('src', '/assets/projects/aside-1280.webp');
    expect(img.getAttribute('srcset')).toContain('aside-640.webp 640w');
    expect(img.getAttribute('srcset')).toContain('aside-1280.webp 1280w');
    expect(img).toHaveAttribute('sizes');
    expect(img).toHaveAttribute('width', '1280');
    expect(img).toHaveAttribute('height', '720');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).not.toHaveClass('pixelated');
  });

  it('asks for the smaller 5/12 screenshot on short laptop screens first (the first match wins)', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const sizes = screen.getByRole('img').getAttribute('sizes')!.split(', ');
    expect(sizes[0]).toBe('(min-width: 1024px) and (max-height: 960px) 400px');
    expect(sizes[1]).toBe('(min-width: 1024px) 540px');
  });

  it('lists the highlights, on phones too (the lead card keeps them)', () => {
    render(<QuestCard project={aside} layout="feature" />);
    aside.highlights!.forEach(h => expect(screen.getByText(h).closest('li')).toBeInTheDocument());
    const list = screen.getByText(aside.highlights![0]).closest('ul')!;
    expect(list).toHaveClass('quest-highlights');
    expect(list).not.toHaveClass('quest-highlights--secondary');
  });

  it('shows at most four tech chips plus an overflow chip, like the side quests', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const chips = screen.getByRole('list', { name: 'Built with' });
    const items = within(chips).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items.slice(0, 4).map(i => i.textContent)).toEqual(aside.tech.slice(0, 4));
    expect(items[4]).toHaveTextContent(`+${aside.tech.length - 4}`);
    // Projects.css reserves the +N chip's room from its character count ("+10").
    expect(chips.style.getPropertyValue('--chip-more-chars')).toBe(String(`+${aside.tech.length - 4}`.length));
  });

  it('sets no +N room when every chip shows', () => {
    const few = { ...aside, tech: aside.tech.slice(0, 4) };
    render(<QuestCard project={few} layout="feature" />);
    const chips = screen.getByRole('list', { name: 'Built with' });
    expect(within(chips).getAllByRole('listitem')).toHaveLength(4);
    expect(chips.style.getPropertyValue('--chip-more-chars')).toBe('');
  });

  it('links to the live demo and the code in new tabs, named after the project', () => {
    render(<QuestCard project={aside} layout="feature" />);
    const live = screen.getByRole('link', { name: /^Live demo: Aside - AI Sidebar/ });
    expect(live).toHaveAttribute('href', aside.live);
    expect(live).toHaveAttribute('target', '_blank');
    expect(live.getAttribute('rel')).toContain('noreferrer');
    const code = screen.getByRole('link', { name: /^Code on GitHub: Aside - AI Sidebar/ });
    expect(code).toHaveAttribute('href', aside.github);
    expect(code).toHaveAttribute('target', '_blank');
  });

  it('toggles the quest log with the full description', async () => {
    const user = userEvent.setup();
    render(<QuestCard project={aside} layout="feature" />);
    const toggle = screen.getByRole('button', { name: 'Quest log: Aside - AI Sidebar' });
    const log = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(log).not.toBeVisible();
    expect(log).toHaveTextContent(aside.description);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(log).toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(log).not.toBeVisible();
  });
});

describe('<QuestCard> main quest (standard)', () => {
  it('shows the item at x6 instead of a screenshot', () => {
    const { container } = render(<QuestCard project={byId('sommelier-bot')} />);
    const item = container.querySelector('svg[data-item]')!;
    expect(item).toHaveAttribute('data-item', 'wine-glass');
    expect(item).toHaveAttribute('width', '144');
    expect(item).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no Live link when the project has no demo', () => {
    const { container } = render(<QuestCard project={byId('sommelier-bot')} />);
    expect(screen.queryByRole('link', { name: /Live demo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Code on GitHub: Sommelier Bot/ })).toBeInTheDocument();
    // One link: on phones Code and Quest log share a row.
    expect(container.querySelector('.quest-actions')).not.toHaveClass('quest-actions--pair');
  });

  it('reads tier, title, tagline, highlights, tech, then actions (every layout keeps this order)', () => {
    const career = byId('career-predictor');
    render(<QuestCard project={career} />);
    const card = screen.getByRole('article', { name: career.title });
    expect(
      inDocumentOrder([
        within(card).getByText('Main quest'),
        within(card).getByRole('heading', { level: 4, name: career.title }),
        within(card).getByText(career.tagline),
        within(card).getByText(career.highlights![0]),
        within(card).getByRole('list', { name: 'Built with' }),
        within(card).getByRole('link', { name: /^Live demo/ }),
        within(card).getByRole('link', { name: /^Code on GitHub/ }),
        within(card).getByRole('button', { name: /^Quest log/ }),
      ]),
    ).toBe(true);
  });

  it('marks its highlights as secondary (hidden below 640px, restated in the quest log)', () => {
    const career = byId('career-predictor');
    render(<QuestCard project={career} />);
    const list = screen.getByText(career.highlights![0]).closest('ul')!;
    expect(list).toHaveClass('quest-highlights', 'quest-highlights--secondary');
  });
});

describe('<QuestCard> side quest', () => {
  it('is a compact card with the item at x2, the tier and the status', () => {
    const clr = byId('clr');
    const { container } = render(<QuestCard project={clr} />);
    const card = screen.getByRole('article', { name: clr.title });
    expect(within(card).getByText('Side quest')).toBeInTheDocument();
    expect(within(card).getByText('In development')).toBeInTheDocument();
    expect(within(card).getByText(/AI pipeline · 2026/)).toBeInTheDocument();
    expect(container.querySelector('svg[data-item="recipe-book"]')).toHaveAttribute('width', '48');
    // highlights are for main quests only; the chip list is the only list
    expect(within(card).getAllByRole('list')).toHaveLength(1);
  });

  it('groups the head and title first (the left column on short laptop screens)', () => {
    const clr = byId('clr');
    const { container } = render(<QuestCard project={clr} />);
    const card = screen.getByRole('article', { name: clr.title });
    const id = container.querySelector('.quest-id')!;
    expect(card.firstElementChild).toBe(id);
    expect(id).toContainElement(within(card).getByText('Side quest'));
    expect(id).toContainElement(within(card).getByRole('heading', { level: 4, name: clr.title }));
    expect(id).not.toContainElement(within(card).getByText(clr.tagline));
    expect(
      inDocumentOrder([
        id,
        within(card).getByText('In development'),
        within(card).getByText(clr.tagline),
        within(card).getByRole('list', { name: 'Built with' }),
        within(card).getByRole('link', { name: /^Code on GitHub/ }),
        within(card).getByRole('button', { name: /^Quest log/ }),
      ]),
    ).toBe(true);
  });

  it('shows no status chip when the project has none', () => {
    render(<QuestCard project={byId('arkanoid-game')} />);
    expect(screen.queryByText('In development')).not.toBeInTheDocument();
  });

  it('keeps Live · Code · Quest log in that order', () => {
    const { container } = render(<QuestCard project={byId('portfolio')} />);
    const controls = screen.getAllByRole('link').concat(screen.getAllByRole('button'));
    expect(controls.map(c => c.textContent)).toEqual(['Live', 'Code', 'Quest log']);
    // Two links: on phones Live · Code share a row and Quest log goes under them.
    expect(container.querySelector('.quest-actions')).toHaveClass('quest-actions--pair');
  });

  it('shows at most four tech chips plus an overflow chip', () => {
    const clr = byId('clr');
    render(<QuestCard project={clr} />);
    const items = within(screen.getByRole('list', { name: 'Built with' })).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items.slice(0, 4).map(i => i.textContent)).toEqual(clr.tech.slice(0, 4));
    expect(items[4]).toHaveTextContent(`+${clr.tech.length - 4}`);
    expect(items[4]).toHaveTextContent(`and ${clr.tech.length - 4} more: ${clr.tech.slice(4).join(', ')}`);
    expect(screen.getByRole('list', { name: 'Built with' }).style.getPropertyValue('--chip-more-chars')).toBe('2');
  });
});

describe('<ResearchLogItem>', () => {
  it('renders a compact row with the item at x1 and a Code link', () => {
    const signal = byId('signal-processing');
    const { container } = render(
      <ul>
        <ResearchLogItem project={signal} />
      </ul>,
    );
    expect(screen.getByRole('heading', { level: 4, name: signal.title })).toBeInTheDocument();
    expect(screen.getByText('Synthetic Signals')).toBeInTheDocument();
    expect(screen.getByText(/Jupyter notebook · 2026/)).toBeInTheDocument();
    expect(screen.getByText(signal.tagline)).toBeInTheDocument();
    expect(container.querySelector('svg[data-item="oscilloscope"]')).toHaveAttribute('width', '24');
    const code = screen.getByRole('link', { name: /^Code on GitHub: Signal Processing - Synthetic Signals/ });
    expect(code).toHaveAttribute('href', signal.github);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
