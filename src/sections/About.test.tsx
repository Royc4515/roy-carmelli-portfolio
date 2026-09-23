import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import About from './About';
import { bio } from '../data/bio';
import { pixelSprites } from '../theme/pixelSprites';

/** The at-a-glance rows, verbatim: any copy change here must be deliberate. */
const AT_A_GLANCE: Array<[string, string]> = [
  ['Degree', 'B.Sc. Computer Science & Neuroscience (dual major)'],
  ['University', 'Bar-Ilan University'],
  ['Year', '3rd year · expected graduation 2027'],
  ['GPA', '85.09 / 100'],
  ['Open to', 'Student & intern roles: full-stack, frontend, AI'],
];

describe('About', () => {
  it('is a region labelled by its "Who I Am" zone title', () => {
    render(<About />);
    const region = screen.getByRole('region', { name: 'Who I Am' });
    expect(region).toHaveAttribute('id', 'about');
    expect(screen.getByRole('heading', { level: 2, name: 'Who I Am' })).toBeInTheDocument();
    expect(screen.getByText('Zone 02 · The Adventurer')).toBeInTheDocument();
  });

  it('renders every bio paragraph, split on blank lines', () => {
    render(<About />);
    const paragraphs = bio.about.split(/\n\s*\n/).map(p => p.trim());
    expect(paragraphs).toHaveLength(3);
    for (const text of paragraphs) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('lists all five at-a-glance labels and values verbatim, in order', () => {
    render(<About />);
    expect(screen.getAllByRole('term').map(el => el.textContent)).toEqual(AT_A_GLANCE.map(([label]) => label));
    expect(screen.getAllByRole('definition').map(el => el.textContent)).toEqual(
      AT_A_GLANCE.map(([, value]) => value),
    );
  });

  it('titles the character sheet and shows name and role', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 3, name: 'Character sheet' })).toBeInTheDocument();
    expect(screen.getByText(bio.name)).toBeInTheDocument();
    expect(screen.getByText(bio.role)).toBeInTheDocument();
  });

  it('shows the portrait as decorative pixel art at exactly ×2', () => {
    const { container } = render(<About />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', pixelSprites.face.src);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('width', String(pixelSprites.face.w * 2));
    expect(img).toHaveAttribute('height', String(pixelSprites.face.h * 2));
    expect(img).toHaveClass('pixelated');
  });

  it('gives the portrait a whole-number ×1 size for short laptop screens', () => {
    const { container } = render(<About />);
    const well = container.querySelector('img')?.parentElement;
    expect(well?.style.getPropertyValue('--face-short-w')).toBe(`${pixelSprites.face.w}px`);
    expect(well?.style.getPropertyValue('--face-short-h')).toBe(`${pixelSprites.face.h}px`);
  });

  it('signs the letter at its foot and, for short screens, at the end of the last paragraph, both hidden from assistive tech', () => {
    const { container } = render(<About />);
    const signatures = screen.getAllByText('- Roy');
    expect(signatures).toHaveLength(2);
    for (const el of signatures) expect(el).toHaveAttribute('aria-hidden', 'true');

    // The inline one closes the last paragraph, and only the short layout shows it.
    const paragraphs = container.querySelectorAll('.px-panel--paper p:not([aria-hidden])');
    const inline = signatures.find(el => el.tagName === 'SPAN');
    expect(inline?.parentElement).toBe(paragraphs[paragraphs.length - 1]);
    expect(inline).toHaveClass('hidden', 'short:block');
    expect(signatures.find(el => el.tagName === 'P')).toHaveClass('short:hidden');
  });

  it('shows the achievement derived from the bio', () => {
    render(<About />);
    expect(screen.getByText('Achievement')).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === 'Combat medic · led a unit that grew from 12 to 30+'),
    ).toBeInTheDocument();
    // The claim must stay backed by the bio text.
    expect(bio.about).toMatch(/combat medic/);
    expect(bio.about).toMatch(/from 12 to 30\+/);
  });
});
