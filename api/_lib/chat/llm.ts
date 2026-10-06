/**
 * A minimal OpenAI-compatible chat client (Groq speaks this API) and a fallback chain across
 * models. Plain fetch, no SDK: one endpoint, and tests inject a fake fetch.
 */
export type Fetch = typeof fetch;

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: LlmMessage[];
  maxTokens: number;
  temperature?: number;
  /** Strict JSON-schema output (Groq supports it on gpt-oss; not together with streaming). */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface Completion {
  content: string;
  model: string;
  promptTokens: number;
  /** Prompt tokens served from Groq's prompt cache; they don't count against rate limits. */
  cachedTokens: number;
}

export class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Seconds the provider asked us to wait (Groq's `retry-after` on a 429), when it said. */
    readonly retryAfterSec: number | null = null,
  ) {
    super(message);
  }

  /** The free tier's per-minute token budget is spent; it refills within seconds. */
  get rateLimited(): boolean {
    return this.status === 429;
  }

  /** A bad or revoked key fails the same way on every model: no point trying the next one. */
  get fatal(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export class OpenAICompatibleProvider {
  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetchFn: Fetch = (...args) => fetch(...args),
    private readonly baseUrl = GROQ_BASE_URL,
    /** Vercel's function limit is longer; a visitor waiting more than this is gone anyway. */
    private readonly timeoutMs = 10_000,
  ) {}

  async complete(request: CompletionRequest): Promise<Completion> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      max_completion_tokens: request.maxTokens,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: request.jsonSchema.name, strict: true, schema: request.jsonSchema.schema },
      };
    }
    // gpt-oss reasons before answering, and those tokens count against max_completion_tokens
    // and the free-tier token budget: a profile Q&A needs very little.
    if (this.model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';

    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ProviderError(0, `${this.model}: ${err instanceof Error ? err.name : 'network error'}`);
    }
    if (!res.ok) {
      // don't touch / no header must stay `null`, not Number(null) = 0 (a zero-second "wait").
      const header = res.headers.get('retry-after');
      const wait = header === null || header.trim() === '' ? NaN : Number(header);
      throw new ProviderError(res.status, `${this.model}: HTTP ${res.status}`, Number.isFinite(wait) && wait >= 0 ? wait : null);
    }

    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: unknown; prompt_tokens_details?: { cached_tokens?: unknown } };
    } | null;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new ProviderError(502, `${this.model}: no content`);
    return {
      content,
      model: this.model,
      promptTokens: Number(data?.usage?.prompt_tokens ?? 0) || 0,
      cachedTokens: Number(data?.usage?.prompt_tokens_details?.cached_tokens ?? 0) || 0,
    };
  }
}

export type ChainOutcome<T> =
  | { ok: true; value: T; completion: Completion }
  /** `busy`: every model was rate limited, so asking again in a minute will work. */
  | { ok: false; busy: boolean };

/** Longest wait worth taking inside one request: the visitor is watching the thinking dots. */
export const MAX_RETRY_WAIT_MS = 5000;
/** When a 429 carries no `retry-after`, the per-minute budget usually frees up this soon. */
const DEFAULT_RETRY_WAIT_MS = 2000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

type RoundOutcome<T> =
  | { ok: true; value: T; completion: Completion }
  | { ok: false; busy: boolean; retryMs: number | null };

/**
 * Tries each model in order until one returns something `parse` accepts. Any failure moves on
 * (rate limit, outage, timeout, malformed output, or a parameter one model rejects) except an
 * auth error, which no other model would fix. When every model was only rate limited (Groq's free
 * tier allows ~8K tokens a minute per model, about 3 questions), it waits as long as Groq asked,
 * if that is short, and goes round once more.
 */
export class FallbackChain {
  constructor(
    private readonly providers: OpenAICompatibleProvider[],
    private readonly wait: (ms: number) => Promise<void> = sleep,
  ) {}

  async run<T>(request: CompletionRequest, parse: (content: string) => T | null): Promise<ChainOutcome<T>> {
    const first = await this.round(request, parse);
    if (first.ok || !first.busy) return first;
    const waitMs = first.retryMs ?? DEFAULT_RETRY_WAIT_MS;
    if (waitMs > MAX_RETRY_WAIT_MS) return { ok: false, busy: true };
    await this.wait(waitMs);
    const second = await this.round(request, parse);
    return second.ok ? second : { ok: false, busy: second.busy };
  }

  private async round<T>(
    request: CompletionRequest,
    parse: (content: string) => T | null,
  ): Promise<RoundOutcome<T>> {
    let allRateLimited = true;
    let retryMs: number | null = null;
    for (const provider of this.providers) {
      try {
        const completion = await provider.complete(request);
        const value = parse(completion.content);
        if (value !== null) return { ok: true, value, completion };
        allRateLimited = false;
        console.warn(JSON.stringify({ chat: 'invalid_output', model: provider.model }));
      } catch (err) {
        const status = err instanceof ProviderError ? err.status : -1;
        console.warn(JSON.stringify({ chat: 'model_failed', model: provider.model, status }));
        if (err instanceof ProviderError && err.fatal) return { ok: false, busy: false, retryMs: null };
        if (err instanceof ProviderError && err.rateLimited) {
          // The soonest any model frees up is the wait worth taking.
          const ms = err.retryAfterSec === null ? null : err.retryAfterSec * 1000;
          if (ms !== null) retryMs = retryMs === null ? ms : Math.min(retryMs, ms);
        } else {
          allRateLimited = false;
        }
      }
    }
    return { ok: false, busy: allRateLimited, retryMs };
  }
}
