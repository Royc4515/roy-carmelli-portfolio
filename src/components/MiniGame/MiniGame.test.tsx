import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MiniGame from './MiniGame';

// The engine is replaced by spies so its lifecycle and input routing can be asserted. It only
// gets built when the canvas yields a 2D context, which jsdom doesn't (the "engine" tests stub it).
const engine = vi.hoisted(() => ({
  init: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
  stop: vi.fn(),
  handleInput: vi.fn(),
  handleSlide: vi.fn(),
  isAwaitingStart: vi.fn(() => false),
}));
vi.mock('./GameEngine', () => ({
  GameEngine: class {
    init = engine.init;
    start = engine.start;
    stop = engine.stop;
    handleInput = engine.handleInput;
    handleSlide = engine.handleSlide;
    isAwaitingStart = engine.isAwaitingStart;
  },
}));

beforeEach(() => Object.values(engine).forEach(spy => spy.mockClear()));

/** A promise resolved from outside: an engine whose sprites are still loading. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => (resolve = r));
  return { promise, resolve };
}

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

  it('JUMP and SLIDE do nothing, without throwing, when the canvas has no 2D context (no engine)', () => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof getContext;
    try {
      render(<MiniGame showTouchControls />);
      expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /slide/i }))).not.toThrow();
      expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /^jump/i }))).not.toThrow();
      expect(engine.handleSlide).not.toHaveBeenCalled();
      expect(engine.handleInput).not.toHaveBeenCalled();
    } finally {
      HTMLCanvasElement.prototype.getContext = getContext;
    }
  });

  it('falls back to the CSS overlay where the Fullscreen API is missing (iPhone Safari)', async () => {
    const user = userEvent.setup();
    const { container } = render(<MiniGame showTouchControls />);
    expect(container.querySelector('.minigame')!.requestFullscreen).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /enter fullscreen/i }));
    expect(container.querySelector('.minigame')).toHaveClass('minigame--fullscreen');
    await user.click(screen.getByRole('button', { name: /exit fullscreen/i }));
    expect(container.querySelector('.minigame')).not.toHaveClass('minigame--fullscreen');
  });

  it('asks for native fullscreen on the game wrapper and shrugs off a refusal', async () => {
    const user = userEvent.setup();
    const request = vi.fn(function (this: HTMLElement) {
      return Promise.reject(new Error('Permissions check failed'));
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
    try {
      const { container } = render(<MiniGame showTouchControls />);
      await user.click(screen.getByRole('button', { name: /enter fullscreen/i }));
      expect(request).toHaveBeenCalledOnce();
      expect(request.mock.contexts[0]).toBe(container.querySelector('.minigame'));
      // The refusal is caught; the CSS overlay still covers the screen.
      expect(container.querySelector('.minigame')).toHaveClass('minigame--fullscreen');
    } finally {
      delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
    }
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
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = getContext;
  });

  it('starts the engine once its sprites have loaded', async () => {
    render(<MiniGame />);
    await waitFor(() => expect(engine.start).toHaveBeenCalledOnce());
  });

  it('never starts an engine whose game was closed while it was still loading', async () => {
    const loading = deferred();
    engine.init.mockImplementationOnce(() => loading.promise);
    const { unmount } = render(<MiniGame />);
    expect(engine.init).toHaveBeenCalledOnce();
    unmount();
    expect(engine.stop).toHaveBeenCalledOnce();
    await act(async () => loading.resolve());
    // Starting now would leave a rAF loop running with nothing left to stop it.
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('JUMP and SLIDE reach the engine while its sprites are still loading', () => {
    engine.init.mockImplementationOnce(() => deferred().promise);
    render(<MiniGame showTouchControls />);
    expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /^jump/i }))).not.toThrow();
    expect(() => fireEvent.pointerDown(screen.getByRole('button', { name: /slide/i }))).not.toThrow();
    expect(engine.start).not.toHaveBeenCalled();
    expect(engine.handleInput).toHaveBeenCalledOnce();
    expect(engine.handleSlide).toHaveBeenCalledOnce();
  });

  it('leaves Ctrl, Cmd and Alt shortcuts to the browser (Ctrl+S saves, it does not slide)', () => {
    render(<MiniGame />);
    const shortcuts = [
      { code: 'KeyS', key: 's', ctrlKey: true },
      { code: 'KeyS', key: 's', metaKey: true },
      { code: 'ArrowDown', key: 'ArrowDown', altKey: true },
      { code: 'ArrowUp', key: 'ArrowUp', altKey: true },
      { code: 'KeyW', key: 'w', ctrlKey: true },
      { code: 'Space', key: ' ', metaKey: true },
    ];
    for (const init of shortcuts) {
      const allowed = fireEvent.keyDown(window, init);
      expect(allowed, `${JSON.stringify(init)} keeps its default action`).toBe(true);
    }
    expect(engine.handleSlide).not.toHaveBeenCalled();
    expect(engine.handleInput).not.toHaveBeenCalled();
    // Plain keys still play.
    expect(fireEvent.keyDown(window, { code: 'KeyS', key: 's' })).toBe(false);
    expect(engine.handleSlide).toHaveBeenCalledOnce();
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

