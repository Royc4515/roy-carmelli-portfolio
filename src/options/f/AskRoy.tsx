import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '../../hooks/useChat';
import { MAX_QUESTION_CHARS, type ChatSource } from '../../lib/chatApi';
import { chatPersona } from '../../data/chatPersona';
import { useModalDialog } from '../shared/hooks';
import { ArrowUpRight, Close } from '../shared/icons';

/**
 * Pixel Roy, the site's AI chat, in option F's own glass. Only the look is new: the behaviour,
 * the API, its limits and its safety rules are the shared `useChat` hook, and every line of UI
 * copy comes from `chatPersona`, exactly as in the pixel site's panel.
 */

/** Roy's face from the wave frame, for the assistant's lines. */
function Avatar() {
  return (
    <span className="of-ask__avatar" aria-hidden="true">
      <img src="/assets/sprites/wave-2.png" width={68} height={92} alt="" />
    </span>
  );
}

function Sources({ sources }: { sources: ChatSource[] }) {
  if (!sources.length) return null;
  return (
    <ul className="of-ask__sources" aria-label="Sources">
      {sources.map(s => (
        <li key={`${s.title}|${s.url}`}>
          {s.url ? (
            <a href={s.url} {...(s.url.startsWith(window.location.origin) ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
              {s.title}
              <ArrowUpRight />
            </a>
          ) : (
            <span>{s.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AskRoy({ open, onClose, onAnswer }: { open: boolean; onClose: () => void; onAnswer?: () => void }) {
  const ref = useModalDialog(open, onClose);
  const { messages, sending, error, send, retry } = useChat();
  const [draft, setDraft] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Keep the newest line in view as the conversation grows.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, error]);

  // The scene's Roy reacts when an answer lands: the chat and the world are one character.
  const answers = messages.filter(m => m.role === 'assistant').length;
  const seen = useRef(answers);
  useEffect(() => {
    if (answers > seen.current) onAnswer?.();
    seen.current = answers;
  }, [answers, onAnswer]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || sending) return;
    send(draft);
    setDraft('');
  };

  return (
    <dialog ref={ref} className="of-ask" aria-labelledby="of-ask-title">
      <header className="of-ask__head">
        <Avatar />
        <div>
          <h2 className="of-ask__title" id="of-ask-title">
            {chatPersona.name}
            <span className="of-ask__badge">{chatPersona.badge}</span>
          </h2>
          <p className="of-ask__sub">An AI version of Roy</p>
        </div>
        <button type="button" className="of-icon-btn of-ask__close" onClick={onClose} aria-label={chatPersona.closeLabel}>
          <Close />
        </button>
      </header>

      <div className="of-ask__log" ref={log} aria-live="polite">
        <div className="of-ask__line" data-role="assistant">
          <p className="of-ask__bubble">{chatPersona.greeting}</p>
        </div>
        {messages.length === 0 && (
          <ul className="of-ask__suggest" aria-label="Suggested questions">
            {chatPersona.suggestions.map(q => (
              <li key={q}>
                <button type="button" onClick={() => send(q)} disabled={sending}>{q}</button>
              </li>
            ))}
          </ul>
        )}
        {messages.map(m => (
          <div key={m.id} className="of-ask__line" data-role={m.role}>
            <p className="of-ask__who opt-sr">{m.role === 'user' ? chatPersona.you : chatPersona.name}:</p>
            <p className="of-ask__bubble">{m.content}</p>
            {m.sources && <Sources sources={m.sources} />}
          </div>
        ))}
        {sending && (
          <div className="of-ask__line" data-role="assistant">
            <p className="of-ask__bubble of-ask__typing">
              <span aria-hidden="true"><i /><i /><i /></span>
              <span className="opt-sr">{chatPersona.thinking}</span>
            </p>
          </div>
        )}
        {error && (
          <div className="of-ask__error" role="alert">
            <p>{chatPersona.errors[error]}</p>
            {(error === 'busy' || error === 'network') && (
              <button type="button" className="of-btn" onClick={retry}>{chatPersona.retry}</button>
            )}
          </div>
        )}
      </div>

      <form className="of-ask__form" onSubmit={submit}>
        <label htmlFor="of-ask-input" className="opt-sr">{chatPersona.inputLabel}</label>
        <textarea
          id="of-ask-input"
          ref={input}
          rows={1}
          value={draft}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={chatPersona.placeholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            // Enter sends, Shift+Enter breaks the line, as in any chat.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="of-btn of-btn--primary" disabled={sending || !draft.trim()}>
          {chatPersona.send}
        </button>
      </form>
      <p className="of-ask__note">
        {chatPersona.disclaimer} <a href="/privacy.html">{chatPersona.privacyLabel}</a>
      </p>
    </dialog>
  );
}
