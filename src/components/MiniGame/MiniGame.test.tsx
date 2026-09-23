import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MiniGame from './MiniGame';

// The engine is replaced by a spy so input routing can be asserted. It only gets built
// when the canvas yields a 2D context, which jsdom doesn't (the "engine" tests stub it).
const engine = vi.hoisted(() => ({
  handleInput: vi.fn(),
  handleSlide: vi.fn(),
  isAwaitingStart: vi.fn(() => false),
}));
vi.mock('./GameEngine', () => ({
  GameEngine: class {
    init = () => Promise.resolve();
    start = () => {};
    stop = () => {};
    handleInput = engine.handleInput;
    handleSlide = engine.handleSlide;
    isAwaitingStart = engine.isAwaitingStart;
  },
}));

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

  it('frames the canvas with the 4px notched px-frame, not a border or inline style', () => {
    const { container, rerender } = render(<MiniGame />);
    let canvas = container.querySelector('canvas')!;
    expect(canvas).toHaveClass('px-frame', 'pixelated', 'px-drop-sm');
    expect(canvas).not.toHaveAttribute('style');
    rerender(<MiniGame showTouchControls />);
    canvas = container.querySelector('canvas')!;
    expect(canvas).toHaveClass('px-frame');
    expect(canvas).not.toHaveAttribute('style');
  });

  it('draws the touch chrome with design-system buttons and pixel icons', () => {
    render(<MiniGame showTouchControls onQuit={() => {}} />);
    const jump = screen.getByRole('button', { name: /^jump/i });
    const slide = screen.getByRole('button', { name: /^slide/i });
    expect(jump).toHaveClass('px-btn', 'px-btn--primary');
    expect(slide).toHaveClass('px-btn', 'px-btn--secondary');
    expect(jump.querySelector('[data-icon="arrow-up"]')).not.toBeNull();
    expect(slide.querySelector('[data-icon="arrow-down"]')).not.toBeNull();
    const quit = screen.getByRole('button', { name: /quit/i });
    expect(quit).toHaveClass('px-btn--icon');
    expect(quit.querySelector('[data-icon="close"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /enter fullscreen/i }).querySelector('[data-icon="fullscreen"]')).not.toBeNull();
    // Nothing positioned over the canvas: every control is a grid item outside it.
    for (const button of screen.getAllByRole('button')) expect(button).not.toHaveAttribute('style');
  });

  it('toggles the fullscreen button between enter and exit on click', async () => {
    const user = userEvent.setup();
    render(<MiniGame showTouchControls />);
    await user.click(screen.getByRole('button', { name: /enter fullscreen/i }));
    const exit = screen.getByRole('button', { name: /exit fullscreen/i });
    expect(exit.querySelector('[data-icon="fullscreen-exit"]')).not.toBeNull();
    await user.click(exit);
    expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeInTheDocument();
  });

  it('quits with Enter or Space on the focused Quit button', async () => {
    const user = userEvent.setup();
    const onQuit = vi.fn();
    render(<MiniGame showTouchControls onQuit={onQuit} />);
    screen.getByRole('button', { name: /quit/i }).focus();
    await user.keyboard('{Enter}');
    expect(onQuit).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onQuit).toHaveBeenCalledTimes(2);
  });
});

describe('MiniGame input routing (engine running)', () => {
  const getContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof getContext;
    engine.handleInput.mockClear();
    engine.handleSlide.mockClear();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = getContext;
  });

  it('a tap on JUMP jumps once: on pointerdown, not again on the click that follows', () => {
    render(<MiniGame showTouchControls />);
    const jump = screen.getByRole('button', { name: /^jump/i });
    fireEvent.pointerDown(jump, { pointerType: 'touch' });
    expect(engine.handleInput).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(jump, { pointerType: 'touch' });
    fireEvent.click(jump);
    expect(engine.handleInput).toHaveBeenCalledTimes(1);
  });

  it('JUMP and SLIDE also work from the keyboard (Enter / Space on the focused key)', async () => {
    const user = userEvent.setup();
    render(<MiniGame showTouchControls />);
    screen.getByRole('button', { name: /^jump/i }).focus();
    await user.keyboard('{Enter}');
    expect(engine.handleInput).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    // Space activates the focused key once; the page-wide Space shortcut stands aside.
    expect(engine.handleInput).toHaveBeenCalledTimes(2);
    screen.getByRole('button', { name: /^slide/i }).focus();
    await user.keyboard('{Enter}');
    expect(engine.handleSlide).toHaveBeenCalledTimes(1);
  });

  it('keeps the keyboard shortcuts when no control has focus', async () => {
    const user = userEvent.setup();
    render(<MiniGame />);
    await waitFor(() => expect(document.querySelector('canvas')).not.toBeNull());
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    expect(engine.handleInput).toHaveBeenCalledTimes(2);
    await user.keyboard('{ArrowDown}');
    expect(engine.handleSlide).toHaveBeenCalledTimes(1);
  });
});

