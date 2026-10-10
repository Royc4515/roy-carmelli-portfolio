import type { OpenAICompatibleProvider } from './llm.js';

/** Scores how likely a message is a prompt-injection or jailbreak attempt, 0 to 1. */
export interface InjectionGuard {
  /** `null` when the guard is unreachable or its answer is unreadable. */
  score(text: string): Promise<number | null>;
}

/** Prompt Guard 2 reads at most 512 tokens; the tail of a long message is cut, not split. */
const MAX_GUARD_CHARS = 1500;

/** Meta's Llama Prompt Guard 2 on Groq: a small classifier that answers with a probability. */
export class PromptGuard implements InjectionGuard {
  constructor(private readonly provider: OpenAICompatibleProvider) {}

  async score(text: string): Promise<number | null> {
    try {
      const { content } = await this.provider.complete({
        messages: [{ role: 'user', content: text.slice(0, MAX_GUARD_CHARS) }],
        maxTokens: 16,
      });
      return parseGuardScore(content);
    } catch {
      return null;
    }
  }
}

export function parseGuardScore(content: string): number | null {
  const match = content.match(/\d*\.?\d+(?:e-?\d+)?/i);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
