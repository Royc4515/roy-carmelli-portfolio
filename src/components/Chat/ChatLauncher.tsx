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

/** The bubble shows once per browser session, until the chat is first opened. */
export const BUBBLE_SEEN_KEY = 'pixel-roy-bubble-seen';
/** Long enough for the page to settle and the visitor to start reading. */
export const BUBBLE_DELAY_MS = 2000;
/** Two loops of the 3-frame wave, then back to standing still. */
const INTRO_WAVE_MS = 2400;

function bubbleSeen(): boolean {
  try {
    return window.sessionStorage.getItem(BUBBLE_SEEN_KEY) === '1';
  } catch {
    return false; // storage blocked: show it, it is harmless
  }
}

function markBubbleSeen(): void {
  try {
    window.sessionStorage.setItem(BUBBLE_SEEN_KEY, '1');
  } catch {
    /* storage blocked: it just shows again next visit */
  }
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
 * Pixel Roy standing in the bottom-right corner on a small "AI" plate. He stands still (motion
 * beside text people are reading distracts), waves when pointed at or focused, and once per
 * session says hello in a speech bubble. Pressing him opens the chat panel, which stays mounted
 * after the first open so closing it keeps the conversation.
 */
export default function ChatLauncher({ enabled = CHAT_ENABLED }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [introWave, setIntroWave] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  const close = useCallback(() => {
    returnFocus.current = true;
    setOpen(false);
  }, []);

  // After the render that closed the panel: on phones the launcher is hidden while the sheet is
  // open, and a hidden button cannot take focus.
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    buttonRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!enabled || bubbleSeen()) return;
    let stopWave: number | undefined;
    const show = window.setTimeout(() => {
      setBubble(true);
      setIntroWave(true);
      stopWave = window.setTimeout(() => setIntroWave(false), INTRO_WAVE_MS);
    }, BUBBLE_DELAY_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(stopWave);
    };
  }, [enabled]);

  if (!enabled) return null;

  const pose = hovered || introWave ? 'wave' : 'idle';
  // Feet stay put when the pose (and so the frame width) changes: each sheet has its own anchor.
  const anchor = { '--chat-anchor-x': `${pixelSprites[pose].anchorX}px` } as CSSProperties;

  return (
    <div className="chat-root" data-chat-root="">
      {bubble && !open && (
        <p className="chat-bubble text-label" aria-hidden="true">
          {chatPersona.bubble}
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
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => {
          setMounted(true);
          setBubble(false);
          markBubbleSeen();
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
