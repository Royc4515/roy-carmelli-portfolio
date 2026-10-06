import { readChatConfig, type ChatConfig } from './config.js';
import { PromptGuard, type InjectionGuard } from './guard.js';
import { KNOWLEDGE } from './knowledge.generated.js';
import { limiterFor, type ChatLimiter } from './limiter.js';
import { FallbackChain, OpenAICompatibleProvider } from './llm.js';
import type { Knowledge } from './types.js';

/** What the chat handler needs from the outside world; tests pass fakes instead. */
export interface ChatDeps {
  config: ChatConfig | null;
  knowledge: Knowledge;
  limiter: (config: ChatConfig) => ChatLimiter;
  guard: (config: ChatConfig) => InjectionGuard | null;
  chain: (config: ChatConfig) => FallbackChain;
  now: () => Date;
}

export function defaultChatDeps(): ChatDeps {
  return {
    config: readChatConfig(),
    knowledge: KNOWLEDGE,
    limiter: config => limiterFor(config.databaseUrl, config.salt),
    guard: config =>
      config.guardModel ? new PromptGuard(new OpenAICompatibleProvider(config.guardModel, config.groqApiKey, undefined, undefined, 4_000)) : null,
    chain: config => new FallbackChain(config.models.map(model => new OpenAICompatibleProvider(model, config.groqApiKey))),
    now: () => new Date(),
  };
}
