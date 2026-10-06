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
  ) {
    super(message);
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
    if (!res.ok) throw new ProviderError(res.status, `${this.model}: HTTP ${res.status}`);

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

export interface ChainResult<T> {
  value: T;
  completion: Completion;
}

/**
 * Tries each model in order until one returns something `parse` accepts. Any failure moves on
 * (rate limit, outage, timeout, malformed output, or a parameter one model rejects) except an
 * auth error, which no other model would fix. `null` when nothing worked.
 */
export class FallbackChain {
  constructor(private readonly providers: OpenAICompatibleProvider[]) {}

  async run<T>(request: CompletionRequest, parse: (content: string) => T | null): Promise<ChainResult<T> | null> {
    for (const provider of this.providers) {
      try {
        const completion = await provider.complete(request);
        const value = parse(completion.content);
        if (value !== null) return { value, completion };
        console.warn(JSON.stringify({ chat: 'invalid_output', model: provider.model }));
      } catch (err) {
        const status = err instanceof ProviderError ? err.status : -1;
        console.warn(JSON.stringify({ chat: 'model_failed', model: provider.model, status }));
        if (err instanceof ProviderError && err.fatal) return null;
      }
    }
    return null;
  }
}
