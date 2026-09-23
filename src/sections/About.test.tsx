import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import About from './About';
import { bio } from '../data/bio';
import { pixelSprites } from '../theme/pixelSprites';

/** The at-a-glance rows, verbatim: any copy change here must be deliberate. */
const AT_A_GLANCE: Array<[string, string]> = [
  ['Degree', 'B.Sc. Computer Science & Neuroscience (dual major)'],
  ['University', 'Bar-Ilan University'],
  ['Year', '3rd Year · Expected graduation 2027'],
  ['GPA', '85.09 / 100'],
  ['Open to', 'Internships · Student roles · R&D'],
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

  it('shows the achievement derived from the bio', () => {
    render(<About />);
    expect(screen.getByText('Achievement')).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === 'Field medic · scaled a unit from 12 to 30+'),
    ).toBeInTheDocument();
    // The claim must stay backed by the bio text.
    expect(bio.about).toMatch(/combat medic/);
    expect(bio.about).toMatch(/from 12 to 30\+/);
  });
});
