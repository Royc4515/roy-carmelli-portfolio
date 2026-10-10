import { UNSAFE } from '../names.js';
import type { ChatTurn } from './types.js';

/** The browser keeps the conversation; the server only sees the last few turns. */
export const MAX_TURNS = 12;
/** Per message; also the input box's limit in the panel. */
export const MAX_TURN_CHARS = 500;
/** An assistant turn echoed back can be longer than a visitor's (answers are capped at 700). */
const MAX_ASSISTANT_CHARS = 800;

/**
 * The validated conversation, or `null` for anything malformed. Only "user" and "assistant"
 * roles get through: a client cannot smuggle in a "system" turn. Invisible and bidi control
 * characters are stripped, the same set the leaderboard strips from names.
 */
export function parseHistory(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_TURNS) return null;
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    // Whitespace first, so a newline becomes a space instead of being stripped with the controls.
    const clean = content.replace(/\s+/g, ' ').replace(UNSAFE, '').trim();
    const limit = role === 'user' ? MAX_TURN_CHARS : MAX_ASSISTANT_CHARS;
    if (!clean || Array.from(clean).length > limit) return null;
    turns.push({ role, content: clean });
  }
  return turns[turns.length - 1].role === 'user' ? turns : null;
}

/** What retrieval searches: the latest question plus the one before ("tell me more about it"). */
export function retrievalQuery(turns: ChatTurn[]): string {
  return turns
    .filter(t => t.role === 'user')
    .slice(-2)
    .map(t => t.content)
    .join(' ');
}

export const isHebrew = (text: string) => /[֐-׿]/.test(text);
