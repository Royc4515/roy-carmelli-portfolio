import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../../hooks/useTheme';
import { usePrefersReducedMotion } from '../shared/hooks';
import { createNeuralField, type FieldColors, type NeuralField } from './neuralField';

/**
 * sRGB values the shader draws with, per theme. They mirror the page tokens in c.css
 * (card ground, muted ink, the accent, a warm second hue for the pointer); a shader cannot
 * read CSS custom properties in OKLCH, so they are written out here.
 */
const FIELD_COLORS: Record<Theme, FieldColors> = {
  day: {
    bg: [0.925, 0.94, 0.972],
    ink: [0.27, 0.33, 0.5],
    spike: [0.0, 0.52, 0.47],
    touch: [0.86, 0.36, 0.1],
    additive: 0,
  },
  night: {
    bg: [0.035, 0.05, 0.095],
    ink: [0.42, 0.52, 0.74],
    spike: [0.3, 0.95, 0.72],
    touch: [1.0, 0.7, 0.34],
    additive: 1,
  },
};

type Support = 'pending' | 'webgl' | 'none';

/**
 * The framed card that holds the shader. Text never sits on the moving field itself: the
 * caption and the pause control are on solid chips, so their contrast holds at every frame.
 */
export function NeuralFieldCard({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<NeuralField | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [support, setSupport] = useState<Support>('pending');
  const [ready, setReady] = useState(false);
  /** The visitor's own choice; null until they use the control, so the OS setting decides. */
  const [choice, setChoice] = useState<boolean | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  const wantsMotion = choice ?? !reducedMotion;

  // Created in an effect only: there is no WebGL (and no window) in the prerender or in tests.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = createNeuralField(canvas, FIELD_COLORS[theme], () => setReady(true));
    fieldRef.current = field;
    setSupport(field ? 'webgl' : 'none');
    if (!field) return;

    const card = cardRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => field.refresh()) : null;
    resizeObserver?.observe(canvas);

    // Off-screen or in a background tab the loop stops: no GPU work nobody can see.
    const io =
      typeof IntersectionObserver !== 'undefined' && card
        ? new IntersectionObserver(entries => setOnScreen(entries.some(e => e.isIntersecting)))
        : null;
    if (io && card) io.observe(card);
    const onVisibility = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);

    // Listen on the window, not the canvas: the field reacts while the pointer is over the
    // hero text too. Passive, and no preventDefault, so a touch still scrolls the page.
    const onPointer = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      // Ignore positions far from the card: the cells there are off-canvas anyway.
      const reach = box.height;
      const near = x > -reach && x < box.width + reach && y > -reach && y < box.height + reach;
      field.setPointer(near ? { x, y } : null);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      field.destroy();
      fieldRef.current = null;
    };
    // don't touch / the theme is applied by the effect below; listing it here would tear down
    // and rebuild the WebGL context on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fieldRef.current?.setColors(FIELD_COLORS[theme]);
  }, [theme]);

  useEffect(() => {
    fieldRef.current?.setRunning(wantsMotion && onScreen && tabVisible);
  }, [wantsMotion, onScreen, tabVisible, support]);

  return (
    <div className="oc-field" ref={cardRef} data-ready={ready ? '' : undefined} data-support={support}>
      {/* Static poster: what a browser without WebGL keeps, and what shows until the first frame. */}
      <div className="oc-field__poster" aria-hidden="true" />
      <canvas className="oc-field__canvas" ref={canvasRef} aria-hidden="true" />
      <p className="oc-field__caption">
        <span className="oc-field__dot" aria-hidden="true" />
        Simulated neurons. {support === 'none' ? 'A still image on this device.' : 'Move the pointer to excite them.'}
      </p>
      {support === 'webgl' && (
        <button
          type="button"
          className="oc-field__pause"
          onClick={() => setChoice(!wantsMotion)}
        >
          <span aria-hidden="true" className="oc-field__pause-icon" data-paused={wantsMotion ? undefined : ''} />
          {wantsMotion ? 'Pause animation' : 'Play animation'}
        </button>
      )}
    </div>
  );
}
