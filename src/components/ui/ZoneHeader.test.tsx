import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ZoneHeader } from './ZoneHeader';

describe('ZoneHeader', () => {
  it('renders the title as an H2 with the given id', () => {
    render(<ZoneHeader zone={1} name="The Library" title="Things I've Built" id="projects-title" />);
    const heading = screen.getByRole('heading', { level: 2, name: "Things I've Built" });
    expect(heading).toHaveAttribute('id', 'projects-title');
  });

  it('shows a zero-padded eyebrow with the zone name', () => {
    render(<ZoneHeader zone={1} name="The Library" title="Things I've Built" id="t" />);
    expect(screen.getByText('Zone 01 · The Library')).toHaveClass('text-label');
  });

  it('does not pad two-digit zones', () => {
    render(<ZoneHeader zone={12} name="Secret Room" title="Hidden" id="t" />);
    expect(screen.getByText('Zone 12 · Secret Room')).toBeInTheDocument();
  });

  it('labels its section through aria-labelledby', () => {
    render(
      <section aria-labelledby="about-title">
        <ZoneHeader zone={2} name="The Adventurer" title="About Me" id="about-title" />
      </section>,
    );
    expect(screen.getByRole('region', { name: 'About Me' })).toBeInTheDocument();
  });

  it('renders the optional subtitle and a decorative icon', () => {
    render(
      <ZoneHeader
        zone={3}
        name="Equipment"
        title="Skills"
        subtitle="What I fight with."
        icon={<svg data-testid="icon" />}
        id="t"
      />,
    );
    expect(screen.getByText('What I fight with.')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('omits the subtitle and icon slots when not given', () => {
    const { container } = render(<ZoneHeader zone={4} name="Resume Scroll" title="Resume" id="t" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('.zone-header__icon')).toBeNull();
    expect(container.querySelector('.px-divider')).toHaveAttribute('aria-hidden', 'true');
  });
});
