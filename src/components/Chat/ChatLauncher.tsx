import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import Character from '../Character';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import { chatPersona } from '../../data/chatPersona';
import { pixelSprites } from '../../theme/pixelSprites';
import { useIsMobile } from '../../hooks/useIsMobile';
import { typeDuration, useTypewriter } from '../../hooks/useTypewriter';
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

/** Roy's nth line, for both bubbles (the corner figure's and the docked one): they take turns. */
const bubbleLine = (n: number) => chatPersona.bubbles[n % chatPersona.bubbles.length];

/** Docked on the hero art: each line stays this long once it has finished typing. */
export const DOCK_LINE_MS = 3200;

/**
 * One line of the docked bubble, typed out like RPG dialogue. The part not typed yet is in the
 * DOM but invisible, so the bubble has its final size and line breaks from the first character
 * and nothing shifts while the text appears. Mounted with a `key`, one instance per line.
 */
function DockedLine({ text }: { text: string }) {
  const { shown, done } = useTypewriter(text, true);
  return (
    <span className="chat-dock-line" data-typing={done ? undefined : ''}>
      <span className="chat-dock-line__typed">{shown}</span>
      <span className="chat-dock-line__rest">{text.slice(shown.length)}</span>
    </span>
  );
}

/** In the wave sprite's frame: the column where Roy's hair starts and the row of his mouth. */
const HEAD_LEFT_COL = 5;
const MOUTH_ROW = 20;
/** The docked bubble is between these widths (px): three short lines, or two when there is room. */
const DOCK_MIN_W = 104;
const DOCK_MAX_W = 168;
/** Bubble to Roy: the 12px tail plus 4px of air. Bubble to the screen edge: its 4px frame plus 4px. */
const DOCK_GAP = 16;
const DOCK_EDGE = 8;
/**
 * Under this width the longest word of the lines ("PROJECTS?", 9 glyphs) no longer fits with the
 * usual padding and letter spacing, so the bubble tightens both (320px-wide phones).
 */
const DOCK_COMPACT_UNDER = 136;
/** The tail leaves the bubble 14px under its top edge (ChatLauncher.css). */
const DOCK_TAIL_Y = 14;

/** Where the docked bubble sits, in page px: beside the hero's Roy, its tail at his mouth. */
export interface DockSpot {
  /** CSS `right`: the bubble ends a tail's length left of his hair. */
  right: number;
  top: number;
  maxWidth: number;
  /** Tight padding and letter spacing: the room is narrow. */
  compact: boolean;
}

/**
 * Finds the spot left of the hero's Roy for the docked bubble, or null when there is no such
 * spot: no hero, an overlay hero (the title card stands left of him there), or too little room.
 * Null falls back to the top-right corner of the hero art (ChatLauncher.css).
 * Exported for the tests: jsdom has no layout, so they feed it rectangles.
 */
export function measureDockSpot(): DockSpot | null {
  const hero = document.getElementById('hero');
  const roy = hero?.querySelector<HTMLElement>('[data-hero-roy]');
  if (!hero || !roy || hero.dataset.layout !== 'stack') return null;
  const box = roy.getBoundingClientRect();
  if (!box.width) return null;
  const k = box.width / pixelSprites.wave.frameW;
  const hairLeft = box.left + HEAD_LEFT_COL * k;
  const room = hairLeft - DOCK_GAP - DOCK_EDGE;
  if (room < DOCK_MIN_W) return null;
  const maxWidth = Math.min(DOCK_MAX_W, Math.floor(room));
  return {
    right: Math.round(document.documentElement.clientWidth - (hairLeft - DOCK_GAP)),
    top: Math.round(box.top + window.scrollY + MOUTH_ROW * k - DOCK_TAIL_Y),
    maxWidth,
    compact: maxWidth < DOCK_COMPACT_UNDER,
  };
}

/** The dock spot while `active`, kept current when the window or the hero's layout changes. */
function useDockSpot(active: boolean): DockSpot | null {
  const [spot, setSpot] = useState<DockSpot | null>(null);
  useEffect(() => {
    if (!active) return;
    const measure = () =>
      setSpot(prev => {
        const next = measureDockSpot();
        // `compact` follows from `maxWidth`, so three numbers decide.
        const same = prev && next && prev.right === next.right && prev.top === next.top && prev.maxWidth === next.maxWidth;
        return same || prev === next ? prev : next;
      });
    measure();
    window.addEventListener('resize', measure);
    // The hero places Roy from its own measurements, a render after it mounts, and moves him
    // when its layout changes: his wrapper's inline style is what changes then.
    const roy = document.querySelector('#hero [data-hero-roy]');
    const watcher = roy && typeof MutationObserver === 'function' ? new MutationObserver(measure) : null;
    if (roy) watcher?.observe(roy, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', measure);
      watcher?.disconnect();
    };
  }, [active]);
  return active ? spot : null;
}

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
 * On phones the first screen is the hero's text and full-width buttons, so there he is docked on
 * the hero art as a speech bubble (tagged AI) coming from the big waving Roy's mouth, typing the
 * same lines the corner figure says, one after another: it scrolls away with the art and covers
 * no text, and it needs no second, smaller Roy beside the first. Where there is no room beside
 * him it takes the art's top-right corner instead. Once the hero has scrolled clear of his corner he stands
 * there as usual and says hello.
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
  const dockSpot = useDockSpot(docked);
  const dockStyle = dockSpot
    ? ({ right: `${dockSpot.right}px`, top: `${dockSpot.top}px`, '--chat-dock-max': `${dockSpot.maxWidth}px` } as CSSProperties)
    : undefined;
  /** Which line the docked bubble is on; it moves on by itself (a phone has no hover to ask). */
  const [dockLine, setDockLine] = useState(0);
  const dockText = bubbleLine(dockLine);
  useEffect(() => {
    if (!docked) return;
    const next = window.setTimeout(() => setDockLine(l => l + 1), typeDuration(dockText.length) + DOCK_LINE_MS);
    return () => window.clearTimeout(next);
  }, [docked, dockText]);
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

  // Docked, the bubble is the hero's Roy talking, so people tap him, not only the bubble: his
  // figure opens the chat too. A pointer shortcut only; the bubble stays the one real button
  // (focusable, labelled), so keyboard and screen-reader users lose nothing.
  useEffect(() => {
    if (!docked) return;
    const hero = document.getElementById('hero');
    const roy = hero?.querySelector<HTMLElement>('[data-hero-roy]');
    if (!hero || !roy) return;
    // don't touch / listen on the hero and test the point against his box, not on his element:
    // in the overlay hero (a sideways phone) the title card's full-width wrapper lies over him
    // and takes the click, so a listener on him never fires there.
    const openChat = (event: MouseEvent) => {
      // While the game runs he is faded out and the launcher is hidden: his spot is not a button.
      if (document.documentElement.hasAttribute('data-arcade-playing')) return;
      // A real control under the finger (a button or link of the title card) keeps its own job.
      if (event.target instanceof Element && event.target.closest('a, button, input, [role="button"]')) return;
      const box = roy.getBoundingClientRect();
      const inside =
        event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) return;
      setMounted(true);
      hideBubble();
      setOpen(true);
    };
    hero.addEventListener('click', openChat);
    roy.setAttribute('data-chat-target', '');
    return () => {
      hero.removeEventListener('click', openChat);
      roy.removeAttribute('data-chat-target');
    };
  }, [docked, hideBubble]);

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
    <div
      className="chat-root"
      data-chat-root=""
      data-docked={docked || undefined}
      data-dock-side={dockSpot ? 'beside' : undefined}
      data-dock-compact={dockSpot?.compact || undefined}
      style={dockStyle}
    >
      {bubble !== null && !open && !docked && (
        // keyed by appearance, so each new line pops in again
        <p key={bubble} className="chat-bubble text-label" aria-hidden="true">
          {bubbleLine(bubble)}
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
        {/* keyed by line while docked: each new line is a new bubble, so it pops in again */}
        <span key={docked ? dockLine : 'plate'} className="chat-launcher__plate text-label" aria-hidden="true">
          {docked ? <DockedLine text={dockText} /> : chatPersona.badge}
        </span>
        {/* Docked, the bubble speaks in Roy's voice; the tag says it is the AI answering. */}
        {docked && (
          <span className="chat-launcher__tag text-label" aria-hidden="true">
            {chatPersona.badge}
          </span>
        )}
      </button>
      {mounted && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onClose={close} />
        </Suspense>
      )}
    </div>
  );
}
