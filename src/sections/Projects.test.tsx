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
  });

  it('groups the quests by tier, in data order', () => {
    render(<Projects />);
    const titlesIn = (name: string) =>
      within(screen.getByRole('list', { name }))
        .getAllByRole('heading', { level: 3 })
        .map(h => h.textContent);
    expect(titlesIn('Main quests')).toEqual(['Aside - AI Sidebar', 'CareerPredict AI', 'Sommelier Bot']);
    expect(titlesIn('Side quests')).toEqual(['Culinary Logic Repository', 'Arkanoid Game', 'This Portfolio']);
    expect(titlesIn('Research logs')).toEqual([
      'Signal Processing - Synthetic Signals',
      'Cognitive Outcomes Regression',
      'White Matter Tracts Quiz',
    ]);
  });

  it('gives every project an H3 and a Code link', () => {
    render(<Projects />);
    projects.forEach(p => {
      expect(screen.getByRole('heading', { level: 3, name: p.title })).toBeInTheDocument();
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
