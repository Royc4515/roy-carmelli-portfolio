import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import Character from '../Character';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import { chatPersona } from '../../data/chatPersona';
import { pixelSprites } from '../../theme/pixelSprites';
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
    if (!enabled) return;
    let stopWave: number | undefined;
    const show = window.setTimeout(() => {
      showBubble(BUBBLE_INTRO_MS);
      setIntroWave(true);
      stopWave = window.setTimeout(() => setIntroWave(false), INTRO_WAVE_MS);
    }, BUBBLE_DELAY_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(stopWave);
    };
  }, [enabled, showBubble]);

  if (!enabled) return null;

  const pose = hovered || introWave ? 'wave' : 'idle';
  // Feet stay put when the pose (and so the frame width) changes: each sheet has its own anchor.
  const anchor = { '--chat-anchor-x': `${pixelSprites[pose].anchorX}px` } as CSSProperties;

  return (
    <div className="chat-root" data-chat-root="">
      {bubble !== null && !open && (
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
          {chatPersona.badge}
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
