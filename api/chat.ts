import { defaultChatDeps, type ChatDeps } from './_lib/chat/deps.js';
import { cannedReply, runOutputHooks, type BlockReason } from './_lib/chat/hooks.js';
import { isHebrew, parseHistory, retrievalQuery } from './_lib/chat/history.js';
import { clientIp } from './_lib/chat/limiter.js';
import { buildRequest, canaryFor, parseDraft } from './_lib/chat/prompt.js';
import { retrieve } from './_lib/chat/retrieve.js';
import { errors, isSameOriginWrite, json, readJsonObject } from './_lib/http.js';

/** 12 turns of at most 800 characters (Hebrew is 2 bytes a letter in UTF-8), plus JSON. */
const MAX_CHAT_BODY_BYTES = 32_768;
/** At or above this Prompt Guard score, the message is treated as a jailbreak attempt. */
export const GUARD_THRESHOLD = 0.9;

export interface ChatSource {
  title: string;
  url: string | null;
}

/**
 * POST /api/chat   { messages: [{ role: "user" | "assistant", content }] }
 *   -> { reply, sources: [{ title, url }] }
 *
 * validate -> rate-limit -> injection guard -> retrieve -> model chain -> output hooks.
 * Nothing about the conversation is stored; only a hashed per-visitor counter for one day.
 * Errors: 400, 403, 429 `rate_limited`/`daily_cap`, 503 `not_configured`/`busy`/`chat_unavailable`.
 */
export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const { config, knowledge } = deps;
  if (!config) return errors.notConfigured();
  if (!isSameOriginWrite(request)) return errors.forbidden();
  const body = await readJsonObject(request, MAX_CHAT_BODY_BYTES);
  if (!body) return errors.badRequest();
  const turns = parseHistory(body.messages);
  if (!turns) return errors.badRequest('invalid_messages');

  const latest = turns[turns.length - 1].content;
  const hebrew = isHebrew(latest);
  const blocked = (reason: BlockReason) => json({ reply: cannedReply(reason, hebrew, knowledge.email), sources: [], blocked: true });

  // Fails closed: without the counter there is nothing between a script and the free quota.
  try {
    const day = deps.now().toISOString().slice(0, 10);
    const verdict = await deps.limiter(config).take(clientIp(request) ?? 'unknown', day);
    if (verdict !== 'ok') return json({ error: verdict }, 429);
  } catch {
    return json({ error: 'chat_unavailable' }, 503);
  }

  // Fails open: the guard is one layer of several, and the output hooks still run.
  const score = await deps.guard(config)?.score(latest);
  if (score != null && score >= GUARD_THRESHOLD) return blocked('injection');

  const facts = retrieve(knowledge, retrievalQuery(turns));
  const canary = canaryFor(config.salt);
  const result = await deps.chain(config).run(buildRequest(knowledge, facts, turns, canary), parseDraft);
  // `busy` (every model over its per-minute budget) passes in a minute; `chat_unavailable` may not.
  if (!result.ok) return json({ error: result.busy ? 'busy' : 'chat_unavailable' }, 503);
  console.info(
    JSON.stringify({ chat: 'ok', model: result.completion.model, prompt: result.completion.promptTokens, cached: result.completion.cachedTokens }),
  );

  const outcome = runOutputHooks(result.value, { knowledge, canary });
  if (!outcome.ok) return blocked(outcome.reason);
  const byId = new Map(knowledge.chunks.map(c => [c.id, c]));
  const sources: ChatSource[] = outcome.draft.sources.map(id => ({ title: byId.get(id)!.title, url: byId.get(id)!.url }));
  return json({ reply: outcome.draft.answer, sources });
}

export const POST = (request: Request) => handleChat(request, defaultChatDeps());
