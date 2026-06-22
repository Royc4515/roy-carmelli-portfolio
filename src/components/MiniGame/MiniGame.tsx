import { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';
import { CANVAS_CONFIG } from './config';

interface MiniGameProps {
  onQuit?: () => void;
  /**
   * When true, render on-screen touch controls (a SLIDE button) over the canvas.
   * Tap-to-jump on the canvas works regardless; this only gates the visible chrome,
   * so it should be set on touch phones in landscape.
   */
  showTouchControls?: boolean;
}

export default function MiniGame({ onQuit, showTouchControls = false }: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  // Keep onQuit in a ref so the effect closure stays stable
  const onQuitRef = useRef(onQuit);
  useEffect(() => { onQuitRef.current = onQuit; }, [onQuit]);

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
    const onClick = () => engine.handleInput();
    // Non-passive so preventDefault() suppresses the synthetic 300ms click (no double
    // jump), double-tap zoom, and page scroll. Inert on non-touch devices.
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      engine.handleInput();
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

  const canvas = (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        cursor: 'pointer',
        maxWidth: '100%',
        // In touch mode the canvas may be enlarged to fill a landscape phone; cap its
        // height to the viewport (dvh handles the iOS collapsing URL bar) while the
        // 800×446 aspect ratio is preserved automatically (canvas is a replaced element).
        ...(showTouchControls ? { maxHeight: '100dvh' } : {}),
        border: '3px solid var(--color-brass)',
        boxShadow: '4px 4px 0 var(--color-wood-dark)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label="Roy Runner mini-game — press Space or click to play"
    />
  );

  if (!showTouchControls) return canvas;

  // Touch layout: canvas + an overlaid SLIDE button anchored bottom-left.
  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      {canvas}
      <button
        type="button"
        aria-label="Slide / duck under obstacles"
        onPointerDown={(e) => {
          // Don't let the press bubble to the canvas touchstart (which would jump).
          e.preventDefault();
          e.stopPropagation();
          engineRef.current?.handleSlide();
        }}
        style={{
          position: 'absolute',
          left: '12px',
          bottom: '12px',
          minWidth: '72px',
          minHeight: '72px',
          padding: '0 0.5rem',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '0.55rem',
          letterSpacing: '0.06em',
          color: 'var(--color-parchment)',
          background: 'rgba(58, 40, 24, 0.55)',
          border: '3px solid var(--color-brass)',
          boxShadow: '3px 3px 0 var(--color-wood-dark)',
          cursor: 'pointer',
          imageRendering: 'pixelated',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ▼<br />SLIDE
      </button>
    </div>
  );
}
