/**
 * Output hooks: every model answer passes through these before a visitor sees it, so a model
 * that ignores its instructions still cannot leak the prompt, show a phone number, link
 * somewhere else, or break the site's style rules. Each hook either returns a (possibly
 * rewritten) draft or blocks the answer, which is then replaced with a canned reply.
 */
import type { ReplyDraft } from './prompt.js';
import type { Knowledge } from './types.js';

export type BlockReason = 'injection' | 'leak' | 'empty';

export interface HookContext {
  knowledge: Knowledge;
  canary: string;
}

export type HookOutcome = { ok: true; draft: ReplyDraft } | { ok: false; reason: BlockReason };

export interface OutputHook {
  readonly name: string;
  apply(draft: ReplyDraft, ctx: HookContext): HookOutcome;
}

const pass = (draft: ReplyDraft): HookOutcome => ({ ok: true, draft });
const rewrite = (draft: ReplyDraft, answer: string): HookOutcome => ({ ok: true, draft: { ...draft, answer } });

/** The prompt's secret marker in an answer means the model was talked into echoing its prompt. */
export const canaryHook: OutputHook = {
  name: 'canary',
  apply: (draft, { canary }) =>
    draft.answer.includes(canary) || /\bPXR-[0-9a-f]{6,}/i.test(draft.answer) ? { ok: false, reason: 'leak' } : pass(draft),
};

/** 9+ digits written as one number: a phone number, never a year range or a count. */
const PHONE = /\+?\(?\d[\d\s().-]{7,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export const piiHook: OutputHook = {
  name: 'pii',
  apply: (draft, { knowledge }) => {
    const answer = draft.answer
      .replace(PHONE, m => (m.replace(/\D/g, '').length >= 9 ? "the site's Contact section" : m))
      .replace(EMAIL, m => (m.toLowerCase() === knowledge.email.toLowerCase() ? m : knowledge.email));
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer);
  },
};

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;

/** Only Roy's own links survive; anything else is cut out of the answer. */
export const linkAllowlistHook: OutputHook = {
  name: 'links',
  apply: (draft, { knowledge }) => {
    const allowed = (url: string) => {
      const full = url.replace(/^www\./i, 'https://www.');
      const norm = full.replace(/^http:\/\//i, 'https://').replace(/\/+$/, '').toLowerCase();
      return knowledge.allowedUrlPrefixes.some(p => {
        const prefix = p.toLowerCase();
        return norm === prefix || norm.startsWith(`${prefix}/`) || norm.startsWith(`${prefix}#`) || norm.startsWith(`${prefix}?`);
      });
    };
    const answer = draft.answer
      .replace(URL_RE, url => {
        // A sentence's final period sticks to the URL; it belongs to the sentence.
        const trail = url.match(/[.,;:!?]+$/)?.[0] ?? '';
        return allowed(url.slice(0, url.length - trail.length)) ? url : trail;
      })
      .replace(/\(\s*\)/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +([.,;:!?])/g, '$1');
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer.trim());
  },
};

/** Cited ids must exist; at most three chips under an answer. */
export const sourcesHook: OutputHook = {
  name: 'sources',
  apply: (draft, { knowledge }) => {
    const known = new Set(knowledge.chunks.map(c => c.id));
    const sources = [...new Set(draft.sources)].filter(id => known.has(id)).slice(0, 3);
    return pass({ ...draft, sources });
  },
};

/** Answers are short by design; a runaway one is cut at a sentence end. */
export const MAX_ANSWER_CHARS = 700;

function cap(text: string): string {
  if (text.length <= MAX_ANSWER_CHARS) return text;
  const cut = text.slice(0, MAX_ANSWER_CHARS);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('\n'));
  return end > MAX_ANSWER_CHARS / 2 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}...`;
}

/** The site's copy rules, enforced rather than requested. */
export const styleHook: OutputHook = {
  name: 'style',
  apply: draft => {
    const answer = cap(
      draft.answer
        .replace(/\s*[–—]\s*/g, ' - ')
        // don't touch / repo rule: the service is never described as "combat medic".
        .replace(/combat medic/gi, 'battalion medic')
        .replace(/\*\*|__|`/g, '')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s*[*•]\s+/gm, '- ')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    );
    if (!answer) return { ok: false, reason: 'empty' };
    return answer === draft.answer ? pass(draft) : rewrite(draft, answer);
  },
};

/** Order matters: the canary is checked on the raw answer, style runs last on the final text. */
export const OUTPUT_HOOKS: readonly OutputHook[] = [canaryHook, piiHook, linkAllowlistHook, sourcesHook, styleHook];

export function runOutputHooks(draft: ReplyDraft, ctx: HookContext, hooks = OUTPUT_HOOKS): HookOutcome {
  let current = draft;
  for (const hook of hooks) {
    const outcome = hook.apply(current, ctx);
    if (!outcome.ok) return outcome;
    current = outcome.draft;
  }
  return pass(current);
}

/** In-character replies for blocked messages, in the visitor's language. */
export function cannedReply(reason: BlockReason, hebrew: boolean, email: string): string {
  if (reason === 'empty') {
    return hebrew
      ? `משהו השתבש לי בתשובה. אפשר לנסות לשאול שוב, או לכתוב לי ישירות ל-${email}.`
      : `Something went sideways with that answer. Try asking again, or email me at ${email}.`;
  }
  return hebrew
    ? 'ניסיון יפה, אבל אני נשאר בדמות: אני כאן כדי לספר על הפרויקטים, הכישורים והלימודים שלי. מה מעניין אותך?'
    : "Nice try, but I'm staying in character: I'm here to talk about my projects, skills and studies. What would you like to know?";
}
