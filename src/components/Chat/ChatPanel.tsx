import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import PixelPanel from '../PixelPanel';
import PixelIcon from '../PixelIcon';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { chatPersona } from '../../data/chatPersona';
import { useChat, type ChatState } from '../../hooks/useChat';
import { useInertWhile } from '../../hooks/useInertWhile';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTypewriter } from '../../hooks/useTypewriter';
import { MAX_QUESTION_CHARS, type ChatRole, type ChatSource } from '../../lib/chatApi';
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
 * A line of text that types itself out once, when `animate` is set at mount. The full text is
 * in the DOM from the start (as screen-reader-only text until typing ends), so the live region
 * announces it once and copying it never doubles it.
 */
function TypedText({ text, animate, skip, onGrow }: { text: string; animate: boolean; skip: number; onGrow: () => void }) {
  const [animateOnce] = useState(animate);
  const { shown, done } = useTypewriter(text, animateOnce, skip);
  useEffect(onGrow, [shown, onGrow]);
  return (
    <p dir="auto" className="chat-entry__text text-body-s">
      <span className={done ? undefined : 'sr-only'}>{text}</span>
      {!done && <span aria-hidden="true">{shown}</span>}
      {done && animateOnce && (
        // The static "more" marker of an RPG text box; SPEC 2.5: nothing ever blinks.
        <span className="chat-entry__end" aria-hidden="true">
          <PixelIcon name="play" size={12} />
        </span>
      )}
    </p>
  );
}

interface EntryProps {
  role: ChatRole;
  text: string;
  sources?: ChatSource[];
  animate: boolean;
  skip: number;
  onGrow: () => void;
}

function Entry({ role, text, sources, animate, skip, onGrow }: EntryProps) {
  return (
    <div className={`chat-entry chat-entry--${role}`}>
      {role === 'assistant' && (
        <span className="chat-entry__portrait" aria-hidden="true">
          <img
            src={pixelSprites.face.src}
            width={pixelSprites.face.w}
            height={pixelSprites.face.h}
            alt=""
            className="pixelated block"
          />
        </span>
      )}
      {role === 'user' && (
        <span className="chat-entry__who text-label" aria-hidden="true">
          {chatPersona.you}
        </span>
      )}
      <div className="chat-entry__body">
        {role === 'assistant' ? (
          <TypedText text={text} animate={animate} skip={skip} onGrow={onGrow} />
        ) : (
          <p dir="auto" className="chat-entry__text text-body-s">
            {text}
          </p>
        )}
        {sources && <SourceChips sources={sources} />}
      </div>
    </div>
  );
}

export interface ChatPanelViewProps extends ChatPanelProps {
  /** Drive the panel from a test or the gallery instead of the live API. */
  chat?: ChatState;
  /** Render in the flow instead of pinned to the viewport (the dev gallery). */
  inline?: boolean;
}

/**
 * Pixel Roy's chat panel, styled as an RPG conversation: Roy's portrait beside parchment speech
 * boxes, answers that type themselves out, and the opening questions as a choice menu. A
 * non-modal panel on desktop, a full-screen sheet on phones. All behaviour comes from `useChat`;
 * this file only renders. Answers are rendered as text, never as HTML.
 */
export default function ChatPanel({ open, onClose, chat: injected, inline = false }: ChatPanelViewProps) {
  const own = useChat();
  const { messages, sending, error, send, retry } = injected ?? own;
  const [draft, setDraft] = useState('');
  const [skip, setSkip] = useState(0);
  const titleId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sheet = useMediaQuery(MOBILE) && !inline;
  // Messages already there when the panel mounts (a remount, the gallery) do not re-type.
  const [firstId] = useState(() => messages[messages.length - 1]?.id ?? 0);

  useEffect(() => {
    if (open && !inline) inputRef.current?.focus({ preventScroll: true });
  }, [open, inline]);

  const scrollToEnd = useRef(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }).current;
  useEffect(scrollToEnd, [messages.length, sending, error, scrollToEnd]);

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
  // Any key also finishes the text that is still typing.
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    setSkip(s => s + 1);
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const submit = (text: string) => {
    if (!text.trim() || sending) return;
    send(text);
    setDraft('');
    // A suggestion button disappears once the conversation starts; without this, focus would
    // fall to <body> and Escape would no longer reach the panel.
    inputRef.current?.focus({ preventScroll: true });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.id;
  return (
    <div
      ref={rootRef}
      id="chat-panel"
      className={cx('chat-panel', inline && 'chat-panel--inline')}
      role="dialog"
      aria-modal={modal || undefined}
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={onKeyDown}
    >
      <PixelPanel
        variant="wood"
        elevation={2}
        padding="sm"
        className="chat-panel__frame"
        tab={
          <>
            <span id={titleId}>{chatPersona.name}</span>
            <span aria-hidden="true">· {chatPersona.badge}</span>
          </>
        }
      >
        <Button variant="icon" size="sm" aria-label={chatPersona.closeLabel} onClick={onClose} className="chat-panel__close">
          <PixelIcon name="close" size={24} />
        </Button>

        <div
          ref={logRef}
          className="chat-log"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          onClick={() => setSkip(s => s + 1)}
        >
          <Entry role="assistant" text={chatPersona.greeting} animate={!inline} skip={skip} onGrow={scrollToEnd} />
          {messages.map(m => (
            <Entry
              key={m.id}
              role={m.role}
              text={m.content}
              sources={m.sources}
              animate={m.id === lastAssistant && m.id > firstId}
              skip={skip}
              onGrow={scrollToEnd}
            />
          ))}
          {sending && (
            <div className="chat-thinking">
              <span className="chat-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sr-only">{chatPersona.thinking}</span>
            </div>
          )}
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
          <ul role="list" className="chat-choices">
            {chatPersona.suggestions.map(s => (
              <li key={s}>
                <button type="button" className="chat-choice text-body-s" onClick={() => submit(s)} disabled={sending}>
                  <span className="chat-choice__cursor" aria-hidden="true">
                    <PixelIcon name="play" size={12} />
                  </span>
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

        <p className="chat-note text-body-s">
          {chatPersona.disclaimer}{' '}
          <a href="/privacy.html" className="underline">
            {chatPersona.privacyLabel}
          </a>
        </p>
      </PixelPanel>
    </div>
  );
}
