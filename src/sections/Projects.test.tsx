import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Projects, { byTier } from './Projects';
import { projects } from '../data/projects';

describe('byTier', () => {
  it('keeps data order within a tier', () => {
    expect(byTier(projects, 'main').map(p => p.id)).toEqual(['ai-sidebar', 'career-predictor', 'sommelier-bot']);
    expect(byTier(projects, 'side').map(p => p.id)).toEqual(['clr', 'arkanoid-game', 'portfolio']);
    expect(byTier(projects, 'research').map(p => p.id)).toEqual([
      'signal-processing',
      'cognitive-correlation',
      'white-matter-game',
    ]);
  });
});

describe('<Projects>', () => {
  it('is the #projects section, labelled by its zone title', () => {
    const { container } = render(<Projects />);
    const section = container.querySelector('section#projects')!;
    const title = screen.getByRole('heading', { level: 2, name: "Things I've Built" });
    expect(section).toHaveAttribute('aria-labelledby', title.id);
    expect(screen.getByText('Zone 01 · The Library')).toBeInTheDocument();
    expect(
      screen.getByText("What I've shipped, from a Chrome extension to AI pipelines. Start with the main quests."),
    ).toBeInTheDocument();
  });

  it('has an H3 per tier that names its list', () => {
    render(<Projects />);
    const tiers = screen.getAllByRole('heading', { level: 3 });
    expect(tiers.map(h => h.textContent)).toEqual(['Main quests', 'Side quests', 'Research logs']);
    tiers.forEach(h => expect(screen.getByRole('list', { name: h.textContent! })).toHaveAttribute('aria-labelledby', h.id));
    // Main and side are visually hidden (each card wears its tier tag); research is the tab plate.
    expect(tiers[0]).toHaveClass('sr-only');
    expect(tiers[1]).toHaveClass('sr-only');
    expect(tiers[2]).not.toHaveClass('sr-only');
    expect(tiers[2].closest('.px-panel__tab')).not.toBeNull();
  });

  it('groups the quests by tier, in data order', () => {
    render(<Projects />);
    const titlesIn = (name: string) =>
      within(screen.getByRole('list', { name }))
        .getAllByRole('heading', { level: 4 })
        .map(h => h.textContent);
    expect(titlesIn('Main quests')).toEqual(['Aside - AI Sidebar', 'CareerPredict AI', 'Sommelier Bot']);
    expect(titlesIn('Side quests')).toEqual(['Culinary Logic Repository', 'Arkanoid Game', 'This Portfolio']);
    expect(titlesIn('Research logs')).toEqual([
      'Signal Processing - Synthetic Signals',
      'Cognitive Outcomes Regression',
      'White Matter Tracts Quiz',
    ]);
  });

  it('gives every project an H4 and a Code link', () => {
    render(<Projects />);
    projects.forEach(p => {
      expect(screen.getByRole('heading', { level: 4, name: p.title })).toBeInTheDocument();
      if (p.github) {
        expect(screen.getByRole('link', { name: new RegExp(`^Code on GitHub: ${p.title}`) })).toHaveAttribute(
          'href',
          p.github,
        );
      }
    });
  });

  it('leads with the featured quest and its screenshot', () => {
    render(<Projects />);
    const main = screen.getByRole('list', { name: 'Main quests' });
    const first = within(main).getAllByRole('article')[0];
    expect(first).toHaveAccessibleName('Aside - AI Sidebar');
    expect(within(first).getByRole('img')).toHaveAttribute('src', '/assets/projects/aside-1280.webp');
  });

  it('renders fixtures when given them, and skips empty tiers', () => {
    const only = projects.filter(p => p.tier === 'side');
    render(<Projects projects={only} />);
    expect(screen.queryByRole('list', { name: 'Main quests' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Side quests' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Research logs' })).not.toBeInTheDocument();
  });
});

describe('Projects.css', () => {
  // Read from disk: the Vitest config stubs CSS imports (css: false).
  const css = readFileSync(resolve(import.meta.dirname, './Projects.css'), 'utf8');

  it('pads the card and bleeds the visual by one value, so the visual never covers the frame', () => {
    // The card's padding is --quest-pad itself (over the panel's p-4 md:p-5)...
    expect(css).toMatch(/\.px-panel\.quest-card \{\s*padding: var\(--quest-pad\);\s*\}/);
    // ...and every negative margin of the visual is that same value (0 and the 24px gap
    // under a top visual are the only other parts).
    const margins = [...css.matchAll(/\.quest-visual \{[^}]*?margin: ([^;]+);/g)].map(m => m[1]);
    expect(margins.length).toBe(3);
    for (const margin of margins) {
      const parts = margin.replace(/calc\(var\(--quest-pad\) \* -1\)/g, 'PAD').split(/\s+/);
      expect(parts).toContain('PAD');
      for (const part of parts) expect(['PAD', '0', '24px']).toContain(part);
    }
    // 16 · 20 from 768px · 16 on short laptop screens, on the 4px grid.
    const pads = [...css.matchAll(/--quest-pad: (\d+)px;/g)].map(m => Number(m[1]));
    expect(pads).toEqual([16, 20, 16]);
  });

  it('keeps the +N chip off a row of its own: the chip before it reserves the room the +N gives back', () => {
    expect(css).toMatch(/\.quest-chips > li:has\(\+ li > \.px-chip--more\) \{\s*margin-inline-end: var\(--chip-more-room\);/);
    expect(css).toMatch(/\.quest-chips > li:has\(> \.px-chip--more\) \{\s*margin-inline-start: calc\(var\(--chip-more-room\) \* -1\);/);
  });
});
