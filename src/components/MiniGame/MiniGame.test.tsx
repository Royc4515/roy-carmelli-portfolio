import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MiniGame from './MiniGame';

describe('MiniGame', () => {
  it('always mounts a canvas element', () => {
    const { container } = render(<MiniGame />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('does not render touch buttons by default (desktop)', () => {
    render(<MiniGame />);
    expect(screen.queryByRole('button', { name: /slide/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^jump/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull();
  });

  it('renders SLIDE, JUMP and fullscreen buttons when showTouchControls is set', () => {
    render(<MiniGame showTouchControls />);
    expect(screen.getByRole('button', { name: /slide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^jump/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeInTheDocument();
  });

  it('renders a QUIT button only when onQuit is provided', () => {
    const { rerender } = render(<MiniGame showTouchControls />);
    expect(screen.queryByRole('button', { name: /quit/i })).toBeNull();
    rerender(<MiniGame showTouchControls onQuit={() => {}} />);
    expect(screen.getByRole('button', { name: /quit/i })).toBeInTheDocument();
  });

  it('pressing JUMP / SLIDE does not throw even before the engine is ready', () => {
    render(<MiniGame showTouchControls />);
    expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /slide/i }))).not.toThrow();
    expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /^jump/i }))).not.toThrow();
  });

  it('toggling fullscreen does not throw (jsdom lacks the Fullscreen API)', () => {
    render(<MiniGame showTouchControls />);
    const fs = screen.getByRole('button', { name: /enter fullscreen/i });
    expect(() => fireEvent.pointerDown(fs)).not.toThrow();
  });
});
