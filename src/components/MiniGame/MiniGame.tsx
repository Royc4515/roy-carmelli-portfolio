import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { GameEngine } from './GameEngine';
import { CANVAS_CONFIG } from './config';

interface MiniGameProps {
  onQuit?: () => void;
  /**
   * When true, render on-screen touch controls (JUMP / SLIDE in a bar below the canvas,
   * plus fullscreen + quit). Tapping the canvas starts/restarts the game but never jumps
   * mid-play (jumping is via the button), so there are no accidental jumps. Set on touch
   * devices.
   */
  showTouchControls?: boolean;
}

// Best-effort native Fullscreen API (standard + WebKit). iOS Safari has neither for
// arbitrary elements, so we also apply a CSS fixed-overlay fallback.
function requestFs(el: HTMLElement): void {
  const fn =
    el.requestFullscreen ??
    (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
  try { void fn?.call(el); } catch { /* ignore */ }
}
function exitFs(): void {
  const fn =
    document.exitFullscreen ??
    (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
  try { void fn?.call(document); } catch { /* ignore */ }
}
function fsElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as unknown as { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
    null
  );
}

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

    const JUMP_KEYS  = new Set(['Space', 'KeyW', 'ArrowUp']);
    const SLIDE_KEYS = new Set(['KeyS', 'ArrowDown']);

    const onKey = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.code)) {
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
    // Touch: a tap starts/restarts the game but does NOT jump mid-play (button only).
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

  // Sync local state when the user leaves native fullscreen via a system gesture.
  useEffect(() => {
    const onChange = () => { if (!fsElement()) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) { if (wrapperRef.current) requestFs(wrapperRef.current); }
      else if (fsElement()) exitFs();
      return next;
    });
  };

  const canvasStyle: CSSProperties = {
    display: 'block',
    imageRendering: 'pixelated',
    cursor: 'pointer',
    boxSizing: 'border-box',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...(showTouchControls
      ? {
          // Fit the viewport, leaving room for the control bar below. The 800×446 ratio
          // is preserved automatically (canvas is a replaced element). dvh tracks the
          // collapsing mobile URL bar.
          maxWidth: isFullscreen ? '100vw' : '100%',
          maxHeight: 'calc(100dvh - 104px)',
          ...(isFullscreen
            ? {}
            : { border: '3px solid var(--color-brass)', boxShadow: '4px 4px 0 var(--color-wood-dark)' }),
        }
      : {
          maxWidth: '100%',
          border: '3px solid var(--color-brass)',
          boxShadow: '4px 4px 0 var(--color-wood-dark)',
        }),
  };

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      style={canvasStyle}
      aria-label="Roy Runner mini-game"
    />
  );

  if (!showTouchControls) return canvasEl;

  // ── Touch layout: canvas (with small corner controls) + a control bar below ──
  const wrapperStyle: CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: 'var(--color-forest-dark)',
      }
    : { position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '100%' };

  const btnVisual: CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    color: 'var(--color-parchment)',
    background: 'rgba(58, 40, 24, 0.6)',
    border: '3px solid var(--color-brass)',
    boxShadow: '3px 3px 0 var(--color-wood-dark)',
    cursor: 'pointer',
    imageRendering: 'pixelated',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 1.4,
  };
  const actionBtn: CSSProperties = { ...btnVisual, minWidth: '76px', minHeight: '64px', fontSize: '0.55rem', letterSpacing: '0.06em', flexShrink: 0 };
  const cornerBtn: CSSProperties = { ...btnVisual, position: 'absolute', minWidth: '44px', minHeight: '44px', fontSize: '0.5rem', padding: '0 0.4rem', zIndex: 5 };
  const safe = (px: number, side: string) => `calc(env(safe-area-inset-${side}, 0px) + ${px}px)`;

  // pointerdown handler: act, and stop the event reaching the canvas.
  const press = (fn: () => void) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {/* Canvas + small corner controls (over the sky, clear of the character) */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', maxWidth: '100%', lineHeight: 0 }}>
        {canvasEl}

        {/* Fullscreen toggle — top-right */}
        <button
          type="button"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onPointerDown={press(toggleFullscreen)}
          style={{ ...cornerBtn, top: safe(10, 'top'), right: safe(10, 'right') }}
        >
          {isFullscreen ? '⤡' : '⛶'}
        </button>

        {/* QUIT — top-right, left of the fullscreen toggle (only when quitting is possible) */}
        {onQuit && (
          <button
            type="button"
            aria-label="Quit game"
            onPointerDown={press(() => { if (isFullscreen) { setIsFullscreen(false); if (fsElement()) exitFs(); } onQuitRef.current?.(); })}
            style={{ ...cornerBtn, top: safe(10, 'top'), right: safe(62, 'right') }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Control bar BELOW the canvas — never covers the running character */}
      <div style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: `0 ${safe(4, 'left')}`,
        boxSizing: 'border-box',
      }}>
        <button
          type="button"
          aria-label="Slide / duck under obstacles"
          onPointerDown={press(() => engineRef.current?.handleSlide())}
          style={actionBtn}
        >
          ▼<br />SLIDE
        </button>

        <button
          type="button"
          aria-label="Jump"
          onPointerDown={press(() => engineRef.current?.handleInput())}
          style={actionBtn}
        >
          ▲<br />JUMP
        </button>
      </div>
    </div>
  );
}
