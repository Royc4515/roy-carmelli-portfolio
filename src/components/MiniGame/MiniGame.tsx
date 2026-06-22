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
          // Fit the viewport; the 800×446 ratio is preserved automatically (canvas is a
          // replaced element). dvh tracks the collapsing mobile URL bar.
          maxWidth: isFullscreen ? '100vw' : '100%',
          maxHeight: '100dvh',
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

  // ── Touch layout: canvas + small overlaid controls in the corners ───────────
  const wrapperStyle: CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-forest-dark)',
      }
    : { position: 'relative', display: 'inline-block', maxWidth: '100%', lineHeight: 0 };

  // Each control is a transparent button (the pressable hit area) wrapping a smaller
  // visible box, so the tappable area is comfortably larger than the button graphic.
  const outerBase: CSSProperties = {
    position: 'absolute',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    zIndex: 5,
  };
  const innerVisual: CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    color: 'var(--color-parchment)',
    background: 'rgba(58, 40, 24, 0.55)',
    border: '2px solid var(--color-brass)',
    boxShadow: '2px 2px 0 var(--color-wood-dark)',
    imageRendering: 'pixelated',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 1.3,
    pointerEvents: 'none', // taps land on the larger outer button
  };
  // Bigger controls (and hit areas) in fullscreen — that's the main playing screen.
  const actVis = isFullscreen ? 68 : 48;   // visible action-button size
  const actHit = isFullscreen ? 96 : 68;   // pressable action-button size
  const actArrow = isFullscreen ? '0.85rem' : '0.6rem';
  const actLabel = isFullscreen ? '0.42rem' : '0.32rem';
  const cornVis = isFullscreen ? 46 : 36;  // visible utility-button size
  const cornHit = isFullscreen ? 66 : 56;  // pressable utility-button size
  const cornFont = isFullscreen ? '0.62rem' : '0.5rem';
  const actInset = isFullscreen ? 14 : 8;
  const cornInset = isFullscreen ? 10 : 8;
  const quitRight = cornInset + cornVis + 8; // sit left of the fullscreen toggle

  const innerAction: CSSProperties = { ...innerVisual, width: `${actVis}px`, height: `${actVis}px`, fontSize: actLabel, gap: '2px' };
  const innerCorner: CSSProperties = { ...innerVisual, width: `${cornVis}px`, height: `${cornVis}px`, fontSize: cornFont };
  const safe = (px: number, side: string) => `calc(env(safe-area-inset-${side}, 0px) + ${px}px)`;

  // pointerdown handler: act, and stop the event reaching the canvas.
  const press = (fn: () => void) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {canvasEl}

      {/* SLIDE — bottom-left. Hit area larger than the visible box, extending up/inward. */}
      <button
        type="button"
        aria-label="Slide / duck under obstacles"
        onPointerDown={press(() => engineRef.current?.handleSlide())}
        style={{ ...outerBase, width: `${actHit}px`, height: `${actHit}px`, left: safe(actInset, 'left'), bottom: safe(actInset, 'bottom'), alignItems: 'flex-end', justifyContent: 'flex-start' }}
      >
        <span style={innerAction}>
          <span style={{ fontSize: actArrow }}>▼</span>
          <span>SLIDE</span>
        </span>
      </button>

      {/* JUMP — bottom-right */}
      <button
        type="button"
        aria-label="Jump"
        onPointerDown={press(() => engineRef.current?.handleInput())}
        style={{ ...outerBase, width: `${actHit}px`, height: `${actHit}px`, right: safe(actInset, 'right'), bottom: safe(actInset, 'bottom'), alignItems: 'flex-end', justifyContent: 'flex-end' }}
      >
        <span style={innerAction}>
          <span style={{ fontSize: actArrow }}>▲</span>
          <span>JUMP</span>
        </span>
      </button>

      {/* Fullscreen toggle — top-right */}
      <button
        type="button"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onPointerDown={press(toggleFullscreen)}
        style={{ ...outerBase, width: `${cornHit}px`, height: `${cornHit}px`, top: safe(cornInset, 'top'), right: safe(cornInset, 'right'), alignItems: 'flex-start', justifyContent: 'flex-end' }}
      >
        <span style={innerCorner}>{isFullscreen ? '⤡' : '⛶'}</span>
      </button>

      {/* QUIT — top-right, left of the fullscreen toggle (only when quitting is possible) */}
      {onQuit && (
        <button
          type="button"
          aria-label="Quit game"
          onPointerDown={press(() => { if (isFullscreen) { setIsFullscreen(false); if (fsElement()) exitFs(); } onQuitRef.current?.(); })}
          style={{ ...outerBase, width: `${cornHit}px`, height: `${cornHit}px`, top: safe(cornInset, 'top'), right: safe(quitRight, 'right'), alignItems: 'flex-start', justifyContent: 'flex-end' }}
        >
          <span style={innerCorner}>✕</span>
        </button>
      )}
    </div>
  );
}
