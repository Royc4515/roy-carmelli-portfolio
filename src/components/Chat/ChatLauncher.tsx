import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
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

/** Shown instead of the panel when its chunk cannot be fetched, so the button never does nothing. */
function ChatLoadFailed({ open, onClose }: ChatPanelProps) {
  if (!open) return null;
  return (
    <div className="chat-panel" role="dialog" aria-label={chatPersona.name}>
      <PixelPanel variant="wood" elevation={2} padding="sm" className="chat-panel__frame">
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
 * Pixel Roy's floating launcher (bottom right) and, once opened, the chat panel. The panel
 * stays mounted after the first open so closing it keeps the conversation.
 */
export default function ChatLauncher({ enabled = CHAT_ENABLED }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  if (!enabled) return null;
  return (
    <div className="chat-root" data-chat-root="">
      <button
        ref={buttonRef}
        type="button"
        className="chat-launcher px-frame px-drop-sm"
        aria-label={chatPersona.launcherLabel}
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => {
          setMounted(true);
          setOpen(o => !o);
        }}
      >
        <img
          src={pixelSprites.face.src}
          width={pixelSprites.face.w}
          height={pixelSprites.face.h}
          alt=""
          className="pixelated block"
        />
        <span className="chat-launcher__badge text-label" aria-hidden="true">
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
