import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MiniGame from './MiniGame';

describe('MiniGame', () => {
  it('always mounts a canvas element', () => {
    const { container } = render(<MiniGame />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('does not render the SLIDE button by default (desktop)', () => {
    render(<MiniGame />);
    expect(screen.queryByRole('button', { name: /slide/i })).toBeNull();
  });

  it('renders the SLIDE button when showTouchControls is set', () => {
    render(<MiniGame showTouchControls />);
    expect(screen.getByRole('button', { name: /slide/i })).toBeInTheDocument();
  });

  it('pressing SLIDE does not throw even before the engine is ready', () => {
    render(<MiniGame showTouchControls />);
    const slide = screen.getByRole('button', { name: /slide/i });
    expect(() => fireEvent.pointerDown(slide)).not.toThrow();
  });
});
