import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import Character from '../Character';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import { chatPersona } from '../../data/chatPersona';
import { pixelSprites } from '../../theme/pixelSprites';
import { useIsMobile } from '../../hooks/useIsMobile';
import './ChatLauncher.css';

export interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

/** Build-time switch; the API needs its own server config too (docs/chat/SETUP.md). */
export const CHAT_ENABLED = import.meta.env.VITE_CHAT_ENABLED === 'true';

/** The page settles first, then Roy says hello. */
export const BUBBLE_DELAY_MS = 800;
/** The hello stays long enough to read, then clears the corner of the page. */
export const BUBBLE_INTRO_MS = 6000;
/** After the pointer leaves, the line lingers a moment instead of vanishing mid-read. */
export const BUBBLE_LINGER_MS = 1500;
/** Two loops of the 3-frame wave, then back to standing still. */
const INTRO_WAVE_MS = 2400;

/** The launcher and its drop reach this far up from the bottom edge (91px figure, 16px inset, air). */
export const LAUNCHER_REACH_PX = 120;

/**
 * Phones only (`watch`): false while the hero still reaches under the launcher's corner.
 * On a phone the first screen is the hero's text and its full-width buttons, and the fixed
 * launcher with its hello bubble used to sit on top of the tagline and the buttons' right end.
 * Without a hero on the page there is nothing to protect, so it reports true.
 */
function useHeroCleared(watch: boolean): boolean {
  const [cleared, setCleared] = useState(!watch);
  useEffect(() => {
    const hero = watch ? document.getElementById('hero') : null;
    if (!hero) {
      setCleared(true);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      setCleared(hero.getBoundingClientRect().bottom <= window.innerHeight - LAUNCHER_REACH_PX);
    };
    // One measure per frame at most: scroll fires far more often than the page paints.
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [watch]);
  return cleared;
}

/** Shown instead of the panel when its chunk cannot be fetched, so the button never does nothing. */
function ChatLoadFailed({ open, onClose }: ChatPanelProps) {
  if (!open) return null;
  return (
    <div className="chat-panel" role="dialog" aria-label={chatPersona.name}>
      <PixelPanel variant="wood" elevation={2} padding="sm" className="chat-panel__frame chat-panel__frame--compact">
        <div className="flex items-start justify-between gap-3">
          <p role="alert" className="text-body text-fg">
            {chatPersona.loadFailed}
          </p>
          <Button variant="icon" aria-label={chatPersona.closeLabel} onClick={onClose}>
            <PixelIcon name="close" size={24} />
          </Button>
        </div>
      </PixelPanel>
    </div>
  );
}

// Lazy: the chat UI and its logic only load when someone opens it. A failed chunk fetch falls
// back to ChatLoadFailed, the same pattern as the game's GameLoadFailed.
const ChatPanel = lazy<ComponentType<ChatPanelProps>>(() =>
  import('./ChatPanel').catch(() => ({ default: ChatLoadFailed })),
);

/**
 * Pixel Roy standing in the bottom-right corner on a small "AI" plate. He says hello in a speech
 * bubble when the page loads, and again, with the next line, whenever he is pointed at or focused.
 * He waves only then: motion beside text people are reading distracts. Pressing him opens the chat
 * panel, which stays mounted after the first open so closing it keeps the conversation.
 * On phones the first screen is the hero's text and full-width buttons, so there he is docked as
 * a small "Ask AI" plate on the top-right corner of the hero art (it scrolls away with the art
 * and covers no text); once the hero has scrolled clear of his corner he stands there as usual
 * and says hello.
 */
export default function ChatLauncher({ enabled = CHAT_ENABLED }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  /** How many times the bubble has appeared; the line shown is the next one in turn. `null` = hidden. */
  const [bubble, setBubble] = useState<number | null>(null);
  const [introWave, setIntroWave] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  /** Focus handed back after closing the panel is not the visitor reaching for Roy: no bubble. */
  const quietFocus = useRef(false);
  const shown = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const isPhone = useIsMobile();
  const heroCleared = useHeroCleared(enabled && isPhone);
  // Docked: the plate on the hero art. An open chat is never docked (its sheet covers the page).
  const docked = isPhone && !heroCleared && !open;
  const visible = !docked;
  /** The hello runs once, the first time he stands in his corner. */
  const introduced = useRef(false);

  const hideBubble = useCallback((afterMs = 0) => {
    window.clearTimeout(hideTimer.current);
    if (afterMs) hideTimer.current = window.setTimeout(() => setBubble(null), afterMs);
    else setBubble(null);
  }, []);

  /** Shows the next line; `forMs` hides it again after that long (0 keeps it up). */
  const showBubble = useCallback(
    (forMs = 0) => {
      window.clearTimeout(hideTimer.current);
      setBubble(shown.current++);
      if (forMs) hideTimer.current = window.setTimeout(() => setBubble(null), forMs);
    },
    [],
  );
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const close = useCallback(() => {
    returnFocus.current = true;
    setOpen(false);
  }, []);

  // After the render that closed the panel: on phones the launcher is hidden while the sheet is
  // open, and a hidden button cannot take focus.
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    quietFocus.current = true;
    buttonRef.current?.focus({ preventScroll: true });
    quietFocus.current = false;
  }, [open]);

  useEffect(() => {
    if (!enabled || !visible || introduced.current) return;
    introduced.current = true;
    let said = false;
    let stopWave: number | undefined;
    const show = window.setTimeout(() => {
      said = true;
      showBubble(BUBBLE_INTRO_MS);
      setIntroWave(true);
      stopWave = window.setTimeout(() => setIntroWave(false), INTRO_WAVE_MS);
    }, BUBBLE_DELAY_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(stopWave);
      // Cancelled before he spoke (scrolled back up, or StrictMode's second run): try again.
      if (!said) introduced.current = false;
    };
  }, [enabled, visible, showBubble]);

  if (!enabled) return null;

  const pose = hovered || introWave ? 'wave' : 'idle';
  // Feet stay put when the pose (and so the frame width) changes: each sheet has its own anchor.
  const anchor = { '--chat-anchor-x': `${pixelSprites[pose].anchorX}px` } as CSSProperties;

  return (
    <div className="chat-root" data-chat-root="" data-docked={docked || undefined}>
      {bubble !== null && !open && !docked && (
        // keyed by appearance, so each new line pops in again
        <p key={bubble} className="chat-bubble text-label" aria-hidden="true">
          {chatPersona.bubbles[bubble % chatPersona.bubbles.length]}
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="chat-launcher"
        aria-label={chatPersona.launcherLabel}
        aria-expanded={open}
        aria-controls="chat-panel"
        data-pose={pose}
        onPointerEnter={() => {
          setHovered(true);
          if (!open) showBubble();
        }}
        onPointerLeave={() => {
          setHovered(false);
          hideBubble(BUBBLE_LINGER_MS);
        }}
        onFocus={() => {
          setHovered(true);
          if (!open && !quietFocus.current) showBubble();
        }}
        onBlur={() => {
          setHovered(false);
          hideBubble(BUBBLE_LINGER_MS);
        }}
        onClick={() => {
          setMounted(true);
          hideBubble();
          setOpen(o => !o);
        }}
      >
        <span className="chat-launcher__sprite" style={anchor}>
          <Character pose={pose} scale={1} decorative />
        </span>
        <span className="chat-launcher__plate text-label" aria-hidden="true">
          {docked ? chatPersona.dockedBadge : chatPersona.badge}
        </span>
      </button>
      {mounted && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onClose={close} />
        </Suspense>
      )}
    </div>
  );
}
