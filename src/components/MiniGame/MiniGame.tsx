import { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';
import { CANVAS_CONFIG } from './config';

interface MiniGameProps {
  onQuit?: () => void;
}

export default function MiniGame({ onQuit }: MiniGameProps) {
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

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onClick);

    return () => {
      engine.stop();
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onClick);
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        cursor: 'pointer',
        maxWidth: '100%',
        border: '3px solid var(--color-brass)',
        boxShadow: '4px 4px 0 var(--color-wood-dark)',
      }}
      aria-label="Roy Runner mini-game — press Space or click to play"
    />
  );
}
