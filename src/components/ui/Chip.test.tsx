import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Chip, ChipList } from './Chip';

const TECH = ['Chrome MV3', 'Streaming / SSE', 'Claude API', 'OOP patterns', 'i18n / RTL', 'Node.js', 'Vitest', 'Canvas'];

describe('Chip', () => {
  it('renders its text with the default tone on a dark surface', () => {
    render(<Chip>React</Chip>);
    const chip = screen.getByText('React');
    expect(chip).toHaveClass('px-chip');
    expect(chip).not.toHaveClass('px-chip--accent');
    expect(chip).not.toHaveClass('px-chip--paper');
  });

  it('supports the accent tone and the paper surface', () => {
    render(
      <Chip tone="accent" surface="paper">
        React
      </Chip>,
    );
    expect(screen.getByText('React')).toHaveClass('px-chip--accent', 'px-chip--paper');
  });
});

describe('ChipList', () => {
  it('renders every item as a list item, keeping tech casing', () => {
    render(<ChipList items={['Node.js', 'TypeScript', 'iOS']} />);
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.map(li => li.textContent)).toEqual(['Node.js', 'TypeScript', 'iOS']);
  });

  it('gives the first accentCount chips the accent tone', () => {
    render(<ChipList items={TECH.slice(0, 4)} accentCount={2} />);
    const chips = screen.getAllByRole('listitem').map(li => li.firstElementChild);
    expect(chips.map(c => c?.classList.contains('px-chip--accent'))).toEqual([true, true, false, false]);
  });

  it('caps at max and adds a +N chip that names the hidden items', () => {
    render(<ChipList items={TECH} max={5} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items.slice(0, 5).map(li => li.textContent)).toEqual(TECH.slice(0, 5));

    const more = items[5].firstElementChild as HTMLElement;
    expect(more).toHaveClass('px-chip--more');
    expect(more).toHaveAttribute('title', 'and 3 more: Node.js, Vitest, Canvas');
    expect(within(more).getByText('+3')).toHaveAttribute('aria-hidden', 'true');
    expect(within(more).getByText('and 3 more: Node.js, Vitest, Canvas')).toHaveClass('sr-only');
  });

  it('adds no overflow chip when the items fit', () => {
    render(<ChipList items={TECH.slice(0, 5)} max={5} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText(/more:/)).toBeNull();
  });

  it('passes the paper surface to every chip, including the overflow chip', () => {
    render(<ChipList items={TECH} max={2} accentCount={1} surface="paper" />);
    const chips = screen.getAllByRole('listitem').map(li => li.firstElementChild);
    expect(chips).toHaveLength(3);
    chips.forEach(chip => expect(chip).toHaveClass('px-chip--paper'));
  });
});
