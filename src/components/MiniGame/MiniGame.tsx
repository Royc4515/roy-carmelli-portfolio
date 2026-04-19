import { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';
import { CANVAS_CONFIG } from './config';

export default function MiniGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useRef — not useState — so game state never triggers React re-renders
  const engineRef = useRef<GameEngine | null>(null);

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
      if (e.code === 'Space') {
        e.preventDefault();
        engine.handleInput();
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
        border: '3px solid #c9a24a',
        boxShadow: '4px 4px 0 #3a2818',
      }}
      aria-label="Roy Runner mini-game — press Space or click to play"
    />
  );
}
