import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatApi, ChatApiError, MAX_QUESTION_CHARS, type ChatSource, type ChatTurn } from '../lib/chatApi';

/** What went wrong, in the terms the UI has copy for (src/data/chatPersona.ts). */
export type ChatErrorCode = 'rate_limited' | 'daily_cap' | 'unavailable' | 'network' | 'invalid';

export interface ChatEntry extends ChatTurn {
  id: number;
  sources?: ChatSource[];
}

export interface ChatState {
  messages: ChatEntry[];
  sending: boolean;
  error: ChatErrorCode | null;
  /** Sends a question; ignored while a previous one is in flight or when it is blank. */
  send: (text: string) => void;
  /** Sends the conversation again after an error (the last question is still in it). */
  retry: () => void;
}

export function errorCode(err: unknown): ChatErrorCode {
  if (!(err instanceof ChatApiError)) return 'unavailable';
  if (err.code === 'network') return 'network';
  if (err.code === 'rate_limited' || err.code === 'daily_cap') return err.code;
  if (err.status === 400) return 'invalid';
  return 'unavailable';
}

const defaultApi = new ChatApi();

/** All chat behaviour, so the panel only renders: swapping the design never touches this. */
export function useChat(api: ChatApi = defaultApi): ChatState {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  // The source of truth for sends: state updaters must stay pure (StrictMode calls them twice),
  // so requests are started from here, never from inside setMessages.
  const messagesRef = useRef<ChatEntry[]>([]);
  const commit = useCallback((next: ChatEntry[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ChatErrorCode | null>(null);
  const nextId = useRef(1);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (history: ChatEntry[]) => {
      inFlight.current = true;
      setSending(true);
      setError(null);
      try {
        const reply = await api.ask(history.map(({ role, content }) => ({ role, content })));
        if (!alive.current) return;
        commit([...messagesRef.current, { id: nextId.current++, role: 'assistant', content: reply.reply, sources: reply.sources }]);
      } catch (err) {
        if (alive.current) setError(errorCode(err));
      } finally {
        inFlight.current = false;
        if (alive.current) setSending(false);
      }
    },
    [api, commit],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.replace(/\s+/g, ' ').trim();
      if (!content || inFlight.current) return;
      const question: ChatEntry = { id: nextId.current++, role: 'user', content: Array.from(content).slice(0, MAX_QUESTION_CHARS).join('') };
      const history = [...messagesRef.current, question];
      commit(history);
      void run(history);
    },
    [run, commit],
  );

  const retry = useCallback(() => {
    const history = messagesRef.current;
    if (inFlight.current || !history.length || history[history.length - 1].role !== 'user') return;
    void run(history);
  }, [run]);

  return { messages, sending, error, send, retry };
}
