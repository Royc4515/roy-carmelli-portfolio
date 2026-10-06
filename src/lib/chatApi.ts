/**
 * Client for pixel Roy, the chat agent behind POST /api/chat. Stateless on the server: the
 * browser keeps the conversation and sends its last turns with every question.
 */
export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ChatSource {
  title: string;
  /** `null` when the fact has no public page to link to. */
  url: string | null;
}

export interface ChatReply {
  reply: string;
  sources: ChatSource[];
  /** The server answered with a canned in-character line instead of the model. */
  blocked: boolean;
}

/** Same limits as the server (api/_lib/chat/history.ts): longer histories are trimmed here. */
export const MAX_TURNS = 12;
export const MAX_QUESTION_CHARS = 500;

/** `code` is the API's `error` field ("rate_limited", "daily_cap"...), or "network". */
export class ChatApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Chat API ${status}: ${code}`);
  }
}

/** The reply as the UI needs it, or `null` when the body is not one. */
export function parseReply(body: unknown): ChatReply | null {
  if (typeof body !== 'object' || body === null) return null;
  const { reply, sources, blocked } = body as { reply?: unknown; sources?: unknown; blocked?: unknown };
  if (typeof reply !== 'string' || !reply.trim()) return null;
  const list = Array.isArray(sources) ? sources : [];
  return {
    reply,
    sources: list.flatMap(s => {
      const { title, url } = (s ?? {}) as { title?: unknown; url?: unknown };
      if (typeof title !== 'string' || !title) return [];
      // Only real web links become clickable; anything else is shown as plain text.
      return [{ title, url: typeof url === 'string' && /^https:\/\//.test(url) ? url : null }];
    }),
    blocked: blocked === true,
  };
}

type Fetch = typeof fetch;

export class ChatApi {
  constructor(
    private readonly fetchFn: Fetch = (...args) => fetch(...args),
    private readonly base = '/api',
  ) {}

  async ask(history: readonly ChatTurn[]): Promise<ChatReply> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.base}/chat`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_TURNS) }),
      });
    } catch {
      throw new ChatApiError(0, 'network');
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* empty or non-JSON body, e.g. no /api under plain `vite` */
    }
    if (!res.ok) {
      const code = (body as { error?: unknown } | null)?.error;
      throw new ChatApiError(res.status, typeof code === 'string' ? code : 'unknown');
    }
    const parsed = parseReply(body);
    if (!parsed) throw new ChatApiError(res.status, 'invalid_reply');
    return parsed;
  }
}
