import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GameEngine } from './GameEngine';
import { CANVAS_CONFIG } from './config';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import PixelIcon from '../PixelIcon';
import './MiniGame.css';

interface MiniGameProps {
  onQuit?: () => void;
  /**
   * When true, render on-screen touch controls: SLIDE and JUMP keys plus Quit and a
   * fullscreen toggle, in rails beside the canvas (landscape) or bars above and below it
   * (portrait), never over it. Tapping the canvas starts/restarts the game but never jumps
   * mid-play (jumping is via the key), so there are no accidental jumps. Set on touch devices.
   */
  showTouchControls?: boolean;
}

// Best-effort native Fullscreen API (standard + WebKit). iPhone Safari has neither for
// arbitrary elements, so the wrapper also gets a CSS fixed-overlay fallback.
function requestFs(el: HTMLElement): void {
  const fn =
    el.requestFullscreen ??
    (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
  try {
    const result = fn?.call(el) as Promise<void> | undefined;
    result?.catch?.(() => {});
  } catch {
    /* ignore */
  }
}
function exitFs(): void {
  const fn =
    document.exitFullscreen ??
    (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
  try {
    const result = fn?.call(document) as Promise<void> | undefined;
    result?.catch?.(() => {});
  } catch {
    /* ignore */
  }
}
function fsElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as unknown as { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
    null
  );
}

/** Keys the game reads from anywhere on the page. */
const JUMP_KEYS = new Set(['Space', 'KeyW', 'ArrowUp']);
const SLIDE_KEYS = new Set(['KeyS', 'ArrowDown']);

/** Space pressed on a focused control belongs to that control (it activates it), not the game. */
function isControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a[href], input, select, textarea, [role="button"]') !== null
  );
}

/** A click that trails a handled pointer press by less than this is the same tap. */
const TAP_CLICK_WINDOW_MS = 600;

/**
 * Handlers for a game key (JUMP / SLIDE). Acting on `pointerdown` makes the key instant
 * (a runner can't wait for the finger to lift); acting on `click` as well makes Enter,
 * Space and assistive tech work. The click that ends a pointer press already handled is
 * ignored, so one tap acts once.
 *
 * While a finger or button is down the key carries `data-pressed`, which MiniGame.css draws
 * as the full press: touch browsers apply `:active` late or not at all once pointerdown is
 * handled, and a key that doesn't visibly go down feels dead.
 */
function useKeyPress(action: () => void) {
  const press = useRef({ handled: false, releasedAt: Number.NEGATIVE_INFINITY });
  const release = (e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.removeAttribute('data-pressed');
  };
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setAttribute('data-pressed', '');
      press.current.handled = true;
      action();
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      release(e);
      press.current.releasedAt = performance.now();
    },
    onPointerLeave: release,
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => {
      release(e);
      press.current.handled = false;
    },
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      e.stopPropagation();
      const { handled, releasedAt } = press.current;
      press.current.handled = false;
      if (handled && performance.now() - releasedAt < TAP_CLICK_WINDOW_MS) return;
      action();
    },
  };
}

/**
 * Roy Runner: the canvas game plus, on touch screens, its controls. The engine
 * (GameEngine and friends) owns the canvas; this component only mounts it, forwards
 * input and draws the chrome with the design system (Button, PixelIcon, `px-frame`).
 */
export default function MiniGame({ onQuit, showTouchControls = false }: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep latest props in refs so the engine effect closure stays stable.
  const onQuitRef = useRef(onQuit);
  useEffect(() => { onQuitRef.current = onQuit; }, [onQuit]);
  const touchRef = useRef(showTouchControls);
  useEffect(() => { touchRef.current = showTouchControls; }, [showTouchControls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const engine = new GameEngine(ctx);
    engineRef.current = engine;

    engine.init().then(() => engine.start());

    const onKey = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.code)) {
        if (e.code === 'Space' && isControl(e.target)) return;
        e.preventDefault();
        engine.handleInput();
      } else if (SLIDE_KEYS.has(e.code)) {
        e.preventDefault();
        engine.handleSlide();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onQuitRef.current?.();
      }
    };
    // Desktop mouse: full input (start / jump / restart).
    const onClick = () => { if (!touchRef.current) engine.handleInput(); };
    // Touch: a tap starts/restarts the game but does NOT jump mid-play (key only).
    // preventDefault still suppresses double-tap zoom and page scroll.
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchRef.current) { engine.handleInput(); return; }
      if (engine.isAwaitingStart()) engine.handleInput();
    };

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      engine.stop();
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      engineRef.current = null;
    };
  }, []);

  // Sync local state when the user leaves native fullscreen via a system gesture (or Esc).
  useEffect(() => {
    const onChange = () => { if (!fsElement()) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Leaving the game (Esc, Quit, unmount) also leaves native fullscreen.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    return () => {
      if (wrapper && fsElement() === wrapper) exitFs();
    };
  }, [showTouchControls]);

  const slideKey = useKeyPress(() => engineRef.current?.handleSlide());
  const jumpKey = useKeyPress(() => engineRef.current?.handleInput());

  const toggleFullscreen = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      if (fsElement()) exitFs();
    } else {
      setIsFullscreen(true);
      if (wrapperRef.current) requestFs(wrapperRef.current);
    }
  };

  const quit = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      if (fsElement()) exitFs();
    }
    onQuitRef.current?.();
  };

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      role="img"
      aria-label="Roy Runner mini-game"
      className={cx('minigame__canvas pixelated px-frame', !showTouchControls && 'px-drop-sm')}
    />
  );

  // Desktop: a screen box that fits the canvas into the room Hero leaves it (MiniGame.css).
  if (!showTouchControls) return <div className="minigame-desk">{canvasEl}</div>;

  // Quit and fullscreen act on click (a real activation: browsers only grant fullscreen
  // after the finger lifts); the game keys act on pointerdown, see useKeyPress.
  return (
    <div ref={wrapperRef} className={cx('minigame px-dots', isFullscreen && 'minigame--fullscreen')}>
      <div className="minigame__layout">
        {onQuit && (
          <Button variant="icon" aria-label="Quit game" className="minigame__quit" onClick={quit}>
            <PixelIcon name="close" size={24} />
          </Button>
        )}
        <Button
          variant="icon"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="minigame__fs"
          onClick={toggleFullscreen}
        >
          <PixelIcon name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={24} />
        </Button>

        <div className="minigame__screen">{canvasEl}</div>

        <Button
          variant="secondary"
          className="minigame__key minigame__slide"
          leadingIcon={<PixelIcon name="arrow-down" size={24} />}
          {...slideKey}
        >
          Slide
        </Button>
        <Button
          className="minigame__key minigame__jump"
          leadingIcon={<PixelIcon name="arrow-up" size={24} />}
          {...jumpKey}
        >
          Jump
        </Button>
      </div>
    </div>
  );
}
