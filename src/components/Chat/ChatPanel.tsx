import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import { chatPersona } from '../../data/chatPersona';
import { useChat, type ChatState } from '../../hooks/useChat';
import { useInertWhile } from '../../hooks/useInertWhile';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MAX_QUESTION_CHARS, type ChatSource } from '../../lib/chatApi';
import { pixelSprites } from '../../theme/pixelSprites';
import type { ChatPanelProps } from './ChatLauncher';
import './ChatPanel.css';

const MOBILE = '(max-width: 767px)';

function SourceChips({ sources }: { sources: ChatSource[] }) {
  if (!sources.length) return null;
  return (
    <ul role="list" className="chat-sources" aria-label="Sources">
      {sources.map(s => (
        <li key={`${s.title}|${s.url}`}>
          {s.url ? (
            <a
              className="px-chip chat-source"
              href={s.url}
              {...(s.url.startsWith(window.location.origin) ? {} : { target: '_blank', rel: 'noreferrer' })}
            >
              {s.title}
            </a>
          ) : (
            <span className="px-chip">{s.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Pixel Roy's chat panel: a non-modal panel on desktop, a full-screen sheet on phones. All
 * behaviour comes from `useChat` (pass `chat` to drive it from a test or the gallery); this
 * file only renders. Answers are rendered as text, never as HTML.
 */
export default function ChatPanel({ open, onClose, chat: injected }: ChatPanelProps & { chat?: ChatState }) {
  const own = useChat();
  const { messages, sending, error, send, retry } = injected ?? own;
  const [draft, setDraft] = useState('');
  const titleId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sheet = useMediaQuery(MOBILE);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Newest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, sending, error]);

  // On a phone the sheet covers the page: lock its scroll and take it out of the tab order.
  const modal = open && sheet;
  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);
  useInertWhile(modal, () => {
    const root = rootRef.current?.closest('[data-chat-root]');
    return root?.parentElement ? [...root.parentElement.children].filter(el => el !== root) : [];
  });

  // Keys stay inside the panel: the page and the game listen on window (Scoreboard does the same).
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const submit = (text: string) => {
    if (!text.trim() || sending) return;
    send(text);
    setDraft('');
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  return (
    <div
      ref={rootRef}
      id="chat-panel"
      className="chat-panel"
      role="dialog"
      aria-modal={modal || undefined}
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={onKeyDown}
    >
      <PixelPanel variant="wood" elevation={2} padding="sm" className="chat-panel__frame">
        <header className="chat-panel__header">
          <img
            src={pixelSprites.face.src}
            width={pixelSprites.face.w}
            height={pixelSprites.face.h}
            alt=""
            className="pixelated block shrink-0"
          />
          <h2 id={titleId} className="min-w-0 flex-1 text-label text-accent-fg">
            {chatPersona.name} <span className="chat-panel__badge">{chatPersona.badge}</span>
          </h2>
          <Button variant="icon" aria-label={chatPersona.closeLabel} onClick={onClose}>
            <PixelIcon name="close" size={24} />
          </Button>
        </header>

        <div ref={logRef} className="chat-log" role="log" aria-live="polite" aria-relevant="additions">
          <div className="chat-msg chat-msg--assistant">
            <p className="text-body-s">{chatPersona.greeting}</p>
          </div>
          {messages.map(m => (
            <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
              <p dir="auto" className="text-body-s">
                {m.content}
              </p>
              {m.sources && <SourceChips sources={m.sources} />}
            </div>
          ))}
          {sending && <p className="chat-thinking text-body-s">{chatPersona.thinking}</p>}
          {error && (
            <div role="alert" className="chat-error">
              <p className="text-body-s">{chatPersona.errors[error]}</p>
              {(error === 'network' || error === 'unavailable') && (
                <Button variant="ghost" onClick={retry}>
                  {chatPersona.retry}
                </Button>
              )}
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <ul role="list" className="chat-suggestions">
            {chatPersona.suggestions.map(s => (
              <li key={s}>
                <button type="button" className="chat-suggestion text-body-s" onClick={() => submit(s)} disabled={sending}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="chat-form" onSubmit={onSubmit}>
          <label htmlFor={inputId} className="sr-only">
            {chatPersona.inputLabel}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className="chat-input text-body-s"
            type="text"
            dir="auto"
            autoComplete="off"
            enterKeyHint="send"
            maxLength={MAX_QUESTION_CHARS}
            placeholder={chatPersona.placeholder}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
            {chatPersona.send}
          </Button>
        </form>

        <p className="chat-note">
          {chatPersona.disclaimer}{' '}
          <a href="/privacy.html" className="underline">
            {chatPersona.privacyLabel}
          </a>
        </p>
      </PixelPanel>
    </div>
  );
}
