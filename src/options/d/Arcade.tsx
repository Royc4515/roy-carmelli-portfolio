import { lazy, Suspense, useEffect, useRef, type ComponentType, useState } from 'react';
import { createPortal } from 'react-dom';
import ArcadeFallback from '../../components/ArcadeFallback';
import GameLoadFailed from '../../components/GameLoadFailed';
import PixelIcon from '../../components/PixelIcon';
import SoundToggle from '../../components/SoundToggle';
import { Button } from '../../components/ui/Button';
import { useGameDisplayMode } from '../../hooks/useGameDisplayMode';
import { isScoreboardConfigured } from '../../lib/scoreboardConfig';
import { useModalDialog } from '../shared/hooks';

/**
 * The real Roy Runner, untouched. It loads only when someone opens play mode; when its chunk
 * cannot be fetched the dialog shows GameLoadFailed instead of an error that unmounts the page
 * (the same pattern as src/sections/Hero.tsx).
 */
const MiniGame = lazy<ComponentType<{ onQuit: () => void; showTouchControls: boolean }>>(() =>
  import('../../components/MiniGame/MiniGame').catch(() => ({ default: GameLoadFailed })),
);

interface ArcadeProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Play mode: a full-screen modal dialog that holds the game. It is portalled to <body>, outside
 * the `.opt` scope, because the game's buttons and labels are styled in `@layer components` and
 * the option's unlayered resets would otherwise override them. A native modal dialog gives the
 * focus trap, an inert page behind it and focus back on the opener when it closes.
 */
export default function Arcade({ open, onClose }: ArcadeProps) {
  const dialogRef = useModalDialog(open, onClose);
  const stageRef = useRef<HTMLDivElement>(null);
  const mode = useGameDisplayMode();

  // The chat launcher hides while the game owns the screen (ChatLauncher.css reads this).
  useEffect(() => {
    document.documentElement.toggleAttribute('data-arcade-playing', open);
    return () => document.documentElement.removeAttribute('data-arcade-playing');
  }, [open]);

  // don't touch / focus the stage, not the first button: showModal() focuses the first
  // focusable element (Quit), and the first press of Space, the jump key, would then quit.
  useEffect(() => {
    if (open) stageRef.current?.focus({ preventScroll: true });
  }, [open]);

  // don't touch / the server renderer (the build-time prerender of the live page) rejects
  // portals, so the dialog exists only after the client has mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <dialog ref={dialogRef} className="od-arcade" aria-label="Roy Runner">
      {/* don't touch / this layer covers the whole dialog: useModalDialog closes on a click whose
          target is the <dialog> itself (its backdrop), and a stray tap beside the canvas must
          not end a run. */}
      <div className="od-arcade__layer px-dots" data-mode={mode}>
        {open && (
          <div ref={stageRef} tabIndex={-1} className="od-arcade__stage" data-mode={mode}>
            {mode === 'desktop' && <h2 className="text-label od-arcade__title">Roy Runner</h2>}
            {mode === 'rotate' ? (
              <ArcadeFallback />
            ) : (
              <Suspense fallback={<p className="text-label od-arcade__title">Loading...</p>}>
                <MiniGame onQuit={onClose} showTouchControls={mode === 'touch'} />
              </Suspense>
            )}
            {/* Touch play has its own Quit, sound and fullscreen keys inside the game chrome. */}
            {mode !== 'touch' && (
              <div className="od-arcade__controls">
                <Button variant="secondary" onClick={onClose} leadingIcon={<PixelIcon name="close" size={12} />}>
                  {mode === 'desktop' ? 'Quit (Esc)' : 'Back to the site'}
                </Button>
                {mode === 'desktop' && isScoreboardConfigured() && (
                  // The scoreboard dialog lives in the game chunk; this only asks it to open.
                  <Button
                    variant="secondary"
                    onClick={() => window.dispatchEvent(new CustomEvent('runner:scores'))}
                    leadingIcon={<PixelIcon name="trophy" size={12} />}
                  >
                    Leaderboard
                  </Button>
                )}
                {mode === 'desktop' && <SoundToggle />}
                {mode === 'desktop' && (
                  <p className="text-hud od-arcade__hint">Space or click to jump - Down arrow to slide - M to mute</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
