import { m, type TargetAndTransition } from 'framer-motion';
import PixelPanel from './PixelPanel';
import PixelIcon from './PixelIcon';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** One 90° turn every 0.8s: upright, sideways, upright… (two hard steps per 1.6s loop). */
const ROTATE_LOOP: TargetAndTransition = {
  rotate: [0, 0, 90, 90],
  transition: {
    duration: 1.6,
    times: [0, 0.5, 0.5, 1],
    ease: 'linear',
    repeat: Infinity,
  },
};

/**
 * Shown instead of Roy Runner on a phone held upright (the 800x446 canvas would be tiny):
 * a stepped "turn your phone" icon, the ARCADE ZONE label and a plain-language message.
 * The icon rests upright under `prefers-reduced-motion: reduce`. Uses `m`, whose DOM animation
 * features come from the root `LazyMotion` in main.tsx (strict), so it never pulls in Framer
 * Motion's full feature bundle.
 */
export default function ArcadeFallback() {
  const reduced = usePrefersReducedMotion();

  return (
    <PixelPanel variant="wood" elevation={2} padding="lg" className="w-full max-w-[400px]">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* No `initial={false}`: it would skip the mount animation, and with it the whole loop,
            leaving the phone parked sideways on the last keyframe. */}
        <m.span
          className="flex text-accent-fg"
          aria-hidden="true"
          animate={reduced ? { rotate: 0 } : ROTATE_LOOP}
        >
          <PixelIcon name="rotate-phone" size={48} />
        </m.span>

        <h2 className="text-label text-accent-fg">Arcade zone</h2>

        <p data-testid="arcade-fallback-message" className="max-w-[32ch] text-body text-fg">
          Turn your phone sideways to play Roy Runner, or open this page on a computer.
        </p>
      </div>
    </PixelPanel>
  );
}
